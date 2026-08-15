import { validateTokens } from '../validate.js'

const report = validateTokens({ scanCode: true })
const { summary } = report

console.log(
  `tokens: ${summary.primitive} primitive · ${summary.semantic} semantic · ${summary.component} component`,
)
console.log(`themes: ${summary.themes.join(', ')} · contrast pairs: ${summary.contrastPairs}`)
for (const warning of report.warnings) console.warn(`⚠ ${warning}`)
for (const error of report.errors) console.error(`✖ ${error}`)

if (!report.ok) {
  console.error(`✖ token validation failed (${report.errors.length} errors)`)
  process.exit(1)
}
console.log('✔ token validation passed')
