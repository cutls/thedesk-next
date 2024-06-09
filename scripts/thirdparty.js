const path = require('path')
const fs = require('fs')

const npmPath = path.join(__dirname, '../thirdparty.json')
const packagePath = path.join(__dirname, '../package.json')
const outPath = path.join(__dirname, '../', 'renderer', 'thirdparty.js')

const npmData = JSON.parse(fs.readFileSync(npmPath))
const packages = JSON.parse(fs.readFileSync(packagePath))
let npm = Object.keys(npmData).map(k => {
  let r = {
    package_name: k,
    license: npmData[k].licenses
  }
  if (npmData[k].publisher) {
    r = Object.assign(r, {
      publisher: npmData[k].publisher
    })
  }
  if (npmData[k].repository) {
    r = Object.assign(r, {
      repository: npmData[k].repository
    })
  }
  return r
})

fs.writeFileSync(outPath, `export const thirdparty = ${JSON.stringify(npm)}; export const packages = ${JSON.stringify(packages)};`)
