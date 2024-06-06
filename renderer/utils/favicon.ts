import url from 'url'
import cheerio from 'cheerio'
import superagent from 'superagent'

export async function getFavicon(domain: string, type: string) {
	let file = null
	const result = await superagent.get(`https://${domain}`)
	const $ = cheerio.load(result.text)
	file = $('link[rel=icon]').attr('href')
	if (!file) file = 'favicon.ico'
	file = url.resolve(`https://${domain}`, file)
	return file
}
