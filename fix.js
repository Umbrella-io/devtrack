const fs = require('fs');

const replaces = [
  {
    file: 'src/app/api/metrics/repos/[owner]/[name]/commits/route.ts',
    from: '{ params }: { params: { owner: string; name: string } }',
    to: '{ params }: { params: Promise<{ owner: string; name: string }> }',
    addAwait: true
  },
  {
    file: 'src/app/api/notifications/[id]/route.ts',
    from: '{ params }: { params: { id: string } }',
    to: '{ params }: { params: Promise<{ id: string }> }',
    addAwait: true
  },
  {
    file: 'src/app/api/public/[username]/route.ts',
    from: '{ params }: { params: { username: string } }',
    to: '{ params }: { params: Promise<{ username: string }> }',
    addAwait: true
  },
  {
    file: 'src/app/api/user/github-accounts/[githubId]/route.ts',
    from: '{ params }: { params: { githubId: string } }',
    to: '{ params }: { params: Promise<{ githubId: string }> }',
    addAwait: true
  },
  {
    file: 'src/app/compare/[users]/page.tsx',
    from: '{ params }: ComparePageProps',
    to: '{ params }: { params: Promise<{ users: string }> }',
    addAwait: true
  },
  {
    file: 'src/app/leaderboard/page.tsx',
    from: 'searchParams,\n}: {\n  searchParams: { tab?: string };\n}',
    to: 'searchParams,\n}: {\n  searchParams: Promise<{ tab?: string }>;\n}',
    addAwaitSearchParams: true
  },
  {
    file: 'src/app/u/[username]/feed.xml/route.ts',
    from: '{ params }: { params: { username: string } }',
    to: '{ params }: { params: Promise<{ username: string }> }',
    addAwait: true
  },
  {
    file: 'src/app/u/[username]/page.tsx',
    from: '{ params,\n}: {\n  params: { username: string };\n}',
    to: '{ params,\n}: {\n  params: Promise<{ username: string }>;\n}',
    addAwait: true
  },
  {
    file: 'src/app/api/auth/link-github/callback/route.ts',
    from: 'cookies().get(',
    to: '(await cookies()).get('
  },
  {
    file: 'src/components/CodingActivityInsightsCard.tsx',
    from: '}: TooltipProps<number, string>) {',
    to: '}: any) {'
  }
];

replaces.forEach(({ file, from, to, addAwait, addAwaitSearchParams }) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Custom manual replacements for specific tricky files
  if (file === 'src/app/compare/[users]/page.tsx') {
      content = content.replace(
        'type ComparePageProps = {\n  params: { users: string };\n};',
        ''
      );
      content = content.replace(
        'export async function generateMetadata({\n  params,\n}: ComparePageProps)',
        'export async function generateMetadata({\n  params,\n}: { params: Promise<{ users: string }> })'
      );
      content = content.replace(
        'export default async function PublicProfileComparePage({\n  params,\n}: ComparePageProps) {',
        'export default async function PublicProfileComparePage({\n  params,\n}: { params: Promise<{ users: string }> }) {\n  const { users } = await params;'
      );
      content = content.replace('const { users } = params;', '');
  } else if (file === 'src/app/leaderboard/page.tsx') {
      content = content.replace(from, to);
      content = content.replace('const tab = searchParams.tab || "all";', 'const resolvedSearchParams = await searchParams;\n  const tab = resolvedSearchParams.tab || "all";');
  } else if (file === 'src/app/u/[username]/page.tsx') {
      content = content.replace(from, to);
      content = content.replace('export async function generateMetadata({', 'export async function generateMetadata({\n  params,\n}: { params: Promise<{ username: string }> }): Promise<Metadata> {\n  const { username } = await params;\n  return {\n    title: `${username}\\`s Profile`,\n  };\n}\n\n/*');
      content = content.replace('const { username } = params;', 'const { username } = await params;');
  } else {
      let parts = content.split(from);
      if (parts.length > 1) {
         content = content.replaceAll(from, to);
         if (addAwait) {
            content = content.replaceAll(/{\s*params\s*}\s*:\s*{\s*params\s*:\s*Promise<{([^}]+)}>\s*}/g, (match, p1) => {
               return match; // Regex replace handled it, we just add `const { ... } = await params;` after the function open brace
            });
            content = content.replace(/export async function (GET|POST|PATCH|DELETE)\([^)]+\)\s*{/g, (match) => {
               return match + '\n  const resolvedParams = await params;\n';
            });
            content = content.replaceAll('params.username', 'resolvedParams.username');
            content = content.replaceAll('params.id', 'resolvedParams.id');
            content = content.replaceAll('params.githubId', 'resolvedParams.githubId');
            content = content.replaceAll('params.owner', 'resolvedParams.owner');
            content = content.replaceAll('params.name', 'resolvedParams.name');
         }
      }
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
});
