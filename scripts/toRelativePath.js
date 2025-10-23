const fs = require('fs')
const path = require('path')

function toRelativePath() {
    const fsList = fs.readdirSync(path.join(__dirname, '..', 'renderer', 'out')).filter(f => f.endsWith('.html'))
    for (const file of fsList) {
        const filePath = path.join(__dirname, '..', 'renderer', 'out', file)
        let content = fs.readFileSync(filePath, 'utf-8')
        content = content.replace(/"\/_next/g, '"./_next')
        fs.writeFileSync(filePath, content, 'utf-8')
    }
}

toRelativePath()
