import re

with open('src/components/ProjectMetrics.tsx', 'r') as f:
    content = f.read()

content = content.replace('<label className="block text-sm font-medium mb-1 text-[var(--foreground)]">\n                    Jira Domain', '<label htmlFor="jiraDomain" className="block text-sm font-medium mb-1 text-[var(--foreground)]">\n                    Jira Domain')
content = content.replace('placeholder="your-company.atlassian.net"', 'id="jiraDomain"\n                    placeholder="your-company.atlassian.net"')

content = content.replace('<label className="block text-sm font-medium mb-1 text-[var(--foreground)]">\n                    Email', '<label htmlFor="email" className="block text-sm font-medium mb-1 text-[var(--foreground)]">\n                    Email')
content = content.replace('type="email"', 'id="email"\n                    type="email"')

content = content.replace('<label className="block text-sm font-medium mb-1 text-[var(--foreground)]">\n                    API Token', '<label htmlFor="apiToken" className="block text-sm font-medium mb-1 text-[var(--foreground)]">\n                    API Token')
content = content.replace('type="password"', 'id="apiToken"\n                    type="password"')

content = content.replace('<label className="block text-sm font-medium mb-1 text-[var(--foreground)]">\n                    Project Key (optional)', '<label htmlFor="projectKey" className="block text-sm font-medium mb-1 text-[var(--foreground)]">\n                    Project Key (optional)')
content = content.replace('placeholder="e.g. PROJ"', 'id="projectKey"\n                    placeholder="e.g. PROJ"')

with open('src/components/ProjectMetrics.tsx', 'w') as f:
    f.write(content)
