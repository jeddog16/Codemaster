# Now Buildings Live Sales Wall

A bold, narrow Salesforce side dashboard for the Now Buildings sales team. Open it beside Salesforce to keep today’s closed-won opportunities, sales totals, best sale, quote of the day, and live recent-sales feed visible throughout the day.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Server-side Salesforce API route
- `jsforce` for Salesforce access

## Install

```bash
npm install
```

> This project intentionally keeps Salesforce access server-side. Do not place Salesforce credentials in client components and do not prefix Salesforce variables with `NEXT_PUBLIC`.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard refreshes `/api/sales` every 30 seconds and shows demo data if Salesforce is not configured or the local API call fails.

## Environment setup

Create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Fill in the required Salesforce variables:

```bash
SF_LOGIN_URL=https://login.salesforce.com
SF_USERNAME=your-salesforce-username@example.com
SF_PASSWORD=your-salesforce-password
SF_SECURITY_TOKEN=your-salesforce-security-token
```

For sandboxes, set `SF_LOGIN_URL=https://test.salesforce.com`.

## Salesforce query

The API route reads recent won Opportunity records created today:

```sql
SELECT Id, Name, Amount, Owner.Name, CreatedDate, StageName
FROM Opportunity
WHERE IsWon = true AND CreatedDate = TODAY
ORDER BY CreatedDate DESC
LIMIT 20
```

The mapper in `lib/salesforce.ts` includes comments showing where Now Buildings custom fields can be added later, such as building size, shed type, quote number, customer account, and production stage.

## Salesforce API access notes

Salesforce username/password/token authentication requires API access for the user. Depending on the Salesforce org, you may need:

- A profile or permission set with API access enabled.
- An unexpired security token for the user.
- Network/IP policies that allow the deployment environment to log in.
- A Connected App or different OAuth flow if the org restricts username/password login.

The API returns safe JSON errors without exposing credentials or tokens. Detailed diagnostics should be checked in server logs.

## Production build

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel.
3. Add the server-only environment variables in **Project Settings → Environment Variables**:
   - `SF_LOGIN_URL`
   - `SF_USERNAME`
   - `SF_PASSWORD`
   - `SF_SECURITY_TOKEN`
4. Deploy.
5. Open the Vercel URL beside Salesforce.

## Security warning

Never expose Salesforce credentials in frontend code. Keep all Salesforce calls inside server files such as `app/api/sales/route.ts` and `lib/salesforce.ts`. Variables named with `NEXT_PUBLIC_` are bundled for the browser and must not be used for Salesforce secrets.
