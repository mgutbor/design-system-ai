import { writeMetadata } from '../metadata/metadata.js'

await writeMetadata()
console.log('✔ metadata generated → packages/react/dist/metadata/')
