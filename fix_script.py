import re

with open("src/app/u/[username]/page.tsx", "r") as f:
    content = f.read()

# 1. Remove the duplicated import
content = re.sub(r'import CopyLinkButton from "@/components/CopyLinkButton";\n', '', content, count=1)

# 2. Remove the incomplete fetchPublicProfile function block (Lines 30 to 42ish)
content = re.sub(r'/\* -------------------- DATA FETCH -------------------- \*/\s*async function fetchPublicProfile.*?redirect\(`/u/\$\{canonicalUsername\}`\);', '/* -------------------- DATA FETCH -------------------- */', content, flags=re.DOTALL)

# 3. Add the missing closing div around line 215. 
# There's a </div> missing for className="mb-8 flex flex-wrap items-start justify-between gap-4"
# It is closed just before <div className="mb-8">\n<ShareProfileSection
content = content.replace('      <div className="mb-8">\n        <ShareProfileSection', '      </div>\n\n      <div className="mb-8">\n        <ShareProfileSection')

with open("src/app/u/[username]/page.tsx", "w") as f:
    f.write(content)
