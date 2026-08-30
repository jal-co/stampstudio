import raw from "../../CHANGELOG.md?raw"

export interface ChangelogEntry {
  version: string
  items: string[]
}

/**
 * Parse the changesets-generated CHANGELOG.md:
 * `## <version>` headings with `- ` bullets underneath
 * (### Minor/Patch Changes headings are skipped).
 */
function parse(md: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  let current: ChangelogEntry | null = null
  for (const line of md.split("\n")) {
    const version = line.match(/^## (.+)/)
    if (version) {
      current = { version: version[1].trim(), items: [] }
      entries.push(current)
      continue
    }
    const bullet = line.match(/^- (.+)/)
    if (bullet && current) {
      // strip changeset commit-hash prefixes like "abc1234: "
      current.items.push(bullet[1].replace(/^[0-9a-f]{7,}: /, "").trim())
    }
  }
  return entries.filter((e) => e.items.length > 0)
}

export const changelog: ChangelogEntry[] = parse(raw)

export const currentVersion =
  changelog[0]?.version.split(".").slice(0, 2).join(".") ?? "1.0"
