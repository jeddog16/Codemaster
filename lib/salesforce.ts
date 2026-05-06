type SalesforceConnectionConstructor = new (options: { loginUrl: string }) => {
  login(username: string, password: string): Promise<unknown>;
  query<T>(soql: string): Promise<{ records: T[] }>;
};

type SalesforceOpportunityRecord = {
  Id: string;
  Name?: string | null;
  Amount?: number | string | null;
  Owner?: {
    Name?: string | null;
  } | null;
  CreatedDate?: string | null;
  StageName?: string | null;

  // Add custom Now Buildings fields here later, for example:
  // Building_Size__c?: string | null;
  // Shed_Type__c?: string | null;
  // Quote_Number__c?: string | null;
  // Account?: { Name?: string | null } | null;
  // Production_Stage__c?: string | null;
};

export type DashboardSale = {
  id: string;
  time: string;
  rep: string;
  customer: string;
  product: string;
  amount: number;
  stage: string;
  createdDate: string;
};

export class SalesforceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesforceConfigError";
  }
}

function getSalesforceEnv() {
  const loginUrl = process.env.SF_LOGIN_URL || "https://login.salesforce.com";
  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;
  const securityToken = process.env.SF_SECURITY_TOKEN;

  if (!username || !password || !securityToken) {
    throw new SalesforceConfigError(
      "Salesforce credentials are not configured. Add SF_USERNAME, SF_PASSWORD, and SF_SECURITY_TOKEN to .env.local.",
    );
  }

  return {
    loginUrl,
    username,
    passwordWithToken: `${password}${securityToken}`,
  };
}

async function createConnection() {
  const { loginUrl, username, passwordWithToken } = getSalesforceEnv();

  // jsforce is imported only on the server so Salesforce credentials and SDK code
  // are never exposed to browser bundles.
  const importServerPackage = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<{ Connection: SalesforceConnectionConstructor }>;
  const jsforceModule = await importServerPackage("jsforce");

  const connection = new jsforceModule.Connection({ loginUrl });
  await connection.login(username, passwordWithToken);
  return connection;
}

function formatSalesTime(createdDate?: string | null) {
  if (!createdDate) {
    return "--:--";
  }

  const date = new Date(createdDate);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function toAmount(amount: SalesforceOpportunityRecord["Amount"]) {
  if (amount == null || amount === "") {
    return 0;
  }

  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount) ? numericAmount : 0;
}

function mapOpportunity(record: SalesforceOpportunityRecord): DashboardSale {
  return {
    id: record.Id,
    time: formatSalesTime(record.CreatedDate),
    rep: record.Owner?.Name || "Unassigned rep",
    customer: record.Name || "Unnamed opportunity",
    product: "", // Add Building_Size__c, Shed_Type__c, Quote_Number__c, or production details here later.
    amount: toAmount(record.Amount),
    stage: record.StageName || "Closed Won",
    createdDate: record.CreatedDate || new Date().toISOString(),
  };
}

export async function getRecentSales(): Promise<DashboardSale[]> {
  const connection = await createConnection();

  // Add custom Now Buildings fields to SELECT later, for example:
  // Building_Size__c, Shed_Type__c, Quote_Number__c, Account.Name, Production_Stage__c
  const soql = `
    SELECT Id, Name, Amount, Owner.Name, CreatedDate, StageName
    FROM Opportunity
    WHERE IsWon = true AND CreatedDate = TODAY
    ORDER BY CreatedDate DESC
    LIMIT 20
  `;

  const result = await connection.query<SalesforceOpportunityRecord>(soql);
  return result.records.map(mapOpportunity);
}
