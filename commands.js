import * as s from "./secondary"
import {client, readyTime, OWNER_ID, BOT_ID, requestsCounter} from "./bot"

import got from 'got'
import Cheerio from "cheerio"
import Intl from "intl"

export function Help(msg) {
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖")
		return
	}

	const helpLines = [
		"Чтобы спросить что-либо, обратись ко мне по имени и введи команду.",
		"Например: `сбот имг креатив намия`",
		"В лс можно без обращения: `имг креатив намия`",
		"*Скобки `<>[]` вводить не надо (они означают обязательные и не очень параметры).*",
		`Пустить меня на свой сервер можно по [этой ссылке через веб-браузер](https://discordapp.com/api/oauth2/authorize?client_id=${BOT_ID}&scope=bot&permissions=0).`
	]
	const helpEmbed = {
		color: 0x7486C2,
		title: "Привет, меня зовут СтиллБот.",
		description: helpLines.join("\n"),
		fields: [
			{
				name: "<название_эмоджи>",
				value: "Запросить реакцию на сообщение – после ввода команды нужно поставить на него любой эмоджи.\nМожно указать сервер, откуда брать эмоджи, приписав \n`:<начало_названия_сервера>`\nСписок всех доступных реакций - `эмоджи`"
			},
			{
				name: "хоумстак [номер_страницы]",
				value: "Почитать [комикс](https://www.homestuck.com/story)."
			},
			{
				name: "когда <что-то случится>",
				value: "Узнай, когда это случится!"
			},
			{
				name: "жд <вопрос с ответом да/нет>",
				value: "Обратиться к мудрости [Железной Двери](https://randomforum.ru/threads/6469/)."
			},
			{
				name: "имг [теги через пробел]",
				value: "Рандомная пикча из [Галереи](https://stilltest.tk/gallery/)."
			},
			{
				name: "<описание пикчи> + прикреплённое изображение",
				value: "Предложить свой скриншот в Галерею (только в ЛС).\nЕсли я поставил в ответ 📮, значит, успешно отправилось."
			}
		],
		image: {
			url: "https://i.imgur.com/kus289H.png"
		}
	}

	msg.channel.send({embed: helpEmbed})
}
export function Ping(msg) {
	let pongText = "🏓 Понг!"
	msg.channel.send(pongText)
		.then((pong) => {
			let userTime = msg.createdTimestamp / 1000
			let botTime = pong.createdTimestamp / 1000
			let pongTime = (botTime - userTime).toFixed(3)
			pong.edit(pongText + " " + pongTime + " сек.")
		})
		.catch(error => console.log(error))
}
const imgDatabaseURL = "https://chaoscraft.ml/files/gallery/"
export async function Img(msg, args) {
	// do not spam by pictures
	if (!s.isThisBotsChannel(msg) && msg.channel.id != "519609441109147655") {
		msg.react("🤖")
		return
	}

	let argsText = ""

	if (args.length > 0) {
		argsText = args.join(",")
		argsText = "?tags=" + encodeURIComponent(argsText)
	}

	try {
		let { body: imageInfo } = await got(`${imgDatabaseURL}random/${argsText}`, { json: true })
		if (imageInfo.error) throw Error(imageInfo.error)
	
		let imageExtension = imageInfo.tags.includes("gif") ? "gif" : "png"
		await msg.channel.send({
			embed: {
				color: 0x7486C2,
				author: {
					name: imageInfo.title,
					icon_url: "https://i.imgur.com/5EOhj0z.png",
					url: `https://stilltest.tk/gallery/#${imageInfo.id}`
				},
				description: `Теги: ${imageInfo.tags.join(", ")}`
					+ (imageInfo.date ? `\nДата: ${imageInfo.date}` : ""),
				image: {
					url: `https://i.imgur.com/${imageInfo.id}.${imageExtension}`
				}
			}
		})
	} catch (err) {
		await msg.react("343057042862243840")
	}
}
export function Tags(msg, args) {
	if (args[0]) {
		return
	}

	let tags = "Доступные теги:\n\n"
	for (let key in translatedTags) {
		tags += ("`" + key + "` ")
	}
	msg.author.send(tags)
		.then(() => {
			s.envelope(msg)
		})
		.catch(error => console.log(error))
}
export async function Send(msg, args, msgCommandOriginal) {
	let imageParamsArray = msgCommandOriginal.match(/\S+ (\S+) ([\s\S]+)/)

	if (!imageParamsArray) {
		msg.react("📜")
		msg.channel.send("Чтобы отправить картинку, нужно добавить к ней описание, дату и место.")
		return
	}

	let startLink = imageParamsArray[1]

	let imgurParams
	let discordLink = ""

	let imageLink = startLink
	let imageID = ""

	if (!imageLink.includes("//i.imgur.com/")) {
		try {
			imgurParams = await s.sendAttachmentToImgur(imageLink)
			if (imgurParams) {
				discordLink = startLink
				imageLink = imgurParams[0]
				imageID = imgurParams[1]
			}
		} catch (err) {
			if (err.statusCode === 400) {
				msg.channel.send("Похоже, что ссылка не понравилась Имгуру.")
				return
			}
		}
	} else {
		try {
			imageID = imageLink.match(/\/\/i\.imgur\.com\/(.+)\./)[1]
		} catch (err) {}
	}

	let imageDate = ""
	if (discordLink) {
		let ogURLParts = discordLink.split("/")
		let ogImgName = ogURLParts[ogURLParts.length - 1]
		if (ogImgName.match(/\d{4}-\d{2}-\d{2}/)) {
			imageDate = ogImgName.match(/\d{4}-\d{2}-\d{2}/)[0]
		}

		discordLink = `<${discordLink}>\n`
	}


	let tagsSplit = imageParamsArray[2].split(/(?:tags|т[еаэ]ги):/i, 2)
	let imageTitle = tagsSplit[0].replace(/\s+$/g, "")

	let imageTags = []
	if (tagsSplit[1]) {
		imageTags = tagsSplit[1].toLowerCase().replace(/^\s+/g, "").split(/[,;\s]+/)
	}
	imageTags.unshift("screenshot", "minecraft")
	let imageTagsText = imageTags.map(x=>'"'+x+'"').join(', ')

	let imageJSON = '```json\n\t"' + imageID + '": {\n\t\t"title": "' + imageTitle + '",\n\t\t"date": "' + imageDate + '",\n\t\t"takenBy": "' + msg.author.username + '",\n\t\t"big": true,\n\t\t"tags": ['+ imageTagsText +']\n\t},\n```'

	client.channels.get("526441608250392577").send("От " + msg.author.tag + ":\n" + discordLink + imageLink + "\n" + imageJSON)
		.then(() => {
			msg.react("📮")
		})
		.catch(error => console.log(error))
}
export function React(msg, args) {
	s.autoreact(msg, args, false) // функция вынесена, так как к ней нужен доступ и без команды
}
export function EmojiList(msg, args, msgCommandOriginal, usedArrowButton, visibleServers) {
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖")
		return
	}

	let fromWhichServer = "343851676404547585"
	let askedServer = s.getGuild(args[0])

	let goRight = false
	let goLeft = false
	if (args[0] == "+") {
		goRight = true
	} else if (args[0] == "-") {
		goLeft = true
	} else if (askedServer) {
		fromWhichServer = askedServer
	}

	if (usedArrowButton && msg.content.match(/\d{17,20}/g)) {
		let prevServer = msg.content.match(/\d{17,20}/g)[0]
		let p = visibleServers.indexOf(prevServer)
		if (p > -1) {
			let n
			if (goRight) {
				n = p + 1
			} else if (goLeft) {
				n = p - 1
			}
			if (n < 0) {
				n = visibleServers.length - 1
			} else if (n >= visibleServers.length) {
				n = 0
			}

			fromWhichServer = visibleServers[n]
		}
	}

	let emServ = client.guilds.get(fromWhichServer)
	if (emServ && emServ.emojis.size) {
		let embed = {
			color: 0xD4A940,
			fields: [
				{
					name: "1-1:",
					value: ""
				}
			]
		}

		let i = 0
		let f = 0
		let emojiDesc = "Доступные эмоджи:\n" + emServ.name + " `" + emServ.id + "`"
		let emojiList = []

		let fieldStart = 1

		emServ.emojis.forEach(key => {
			let prefix = "<:"
			let postfix = ">" + " `" + key.name + "`"
			if (key.animated) {
				prefix = "<a:"
			}
			if (++i % 10 == 1) {
				prefix = "\n" + prefix
			}
			let emojiInfo = prefix + key.name + ":" + key.id + postfix
			emojiList.push(emojiInfo)
			let emListText = emojiList.join(" ")

			if (f >= 6) {
				return
			} else if (emListText.length < 993) {
				embed.fields[f].name = fieldStart + "-" + i + ":"
				embed.fields[f].value = emListText
			} else {
				emojiList = []
				emojiList.push(emojiInfo)
				if (emojiInfo.length < 993) {
					fieldStart = i
					f++
					embed.fields[f] = {}
					embed.fields[f].name = fieldStart + "-" + i + ":"
					embed.fields[f].value = emojiInfo
				}
			}
		})

		/*
		emojis += emojiList.join(" ")
		if (emojis.length >= 2000) {
			emojis.substring(0, emojis.length) + "…"
		}
		*/

		if (usedArrowButton) {
			msg.edit(emojiDesc, {embed: embed})
		} else {
			msg.channel.send(emojiDesc, {embed: embed})
				.then((msg) => {
					msg.react("⬅")
						.then(() => {
							msg.react("➡")
						})
						.catch(error => console.log(error))
				})
				.catch(error => console.log(error))
		}
	}

	return
}
export function Sticker(msg, args) {
	// do not spam by pictures
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖")
		return
	}

	if (!args[0]) {
		msg.react("📜")
		return
	}

	let emoji

	if (args[0].match(/^\d+$/g)) {
		if (client.emojis.get(args[0])) {
			emoji = client.emojis.get(args[0])
			s.sendEmojiLinkEmbed(msg, emoji)
			s.deleteUserMessage(msg)
			return
		}
	}

	let emojiName = s.getEmojiName(args[0])

	let guildName
	let guildCheck

	if (guildCheck = emojiName.match(/^([^:]+)(?::(\S+))$/)) {
		emojiName = guildCheck[1]
		guildName = guildCheck[2]
	}

	emoji = s.findEmoji(emojiName, guildName, msg.channel)

	if (!emoji) {
		msg.react("343057042862243840")
		return
	}

	s.sendEmojiLinkEmbed(msg, emoji)
}
export function Servers(msg, args) {
	let embed = {
		color: 0x888888,
		description: "```"
	}

	let showAllServers = false
	if (msg.author.id == OWNER_ID && args[0] != "emoji") {
		showAllServers = true
	}

	let counter = 0
	client.guilds.forEach(key => {
		if (showAllServers || key.emojis.size) {
			counter++
			embed.description += "\n" + key.id + " | " + key.name
		}
	})
	embed.description += "```"
	embed.title = counter + " серверов"

	if (!showAllServers) {
		embed.title += " с эмоджи"
	}

	msg.author.send({embed: embed})
		.then(() => {
			s.envelope(msg)
		})
		.catch(error => console.log(error))
}
export function Avatar(msg, args, msgCommandOriginal) {
	// do not spam by pictures
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖")
		return
	}
	let user
	if (args[0]) {
		user = s.findUserToGetAvatar(s.getSimpleString(msgCommandOriginal.match(/\S+ (.+)/)[1]))
		if (user) {
			if (user.avatar) {
				s.sendUserAvatarEmbed(msg, user)
			}
		} else {
			msg.react("343057042862243840")
		}
	} else {
		user = msg.author
		s.sendUserAvatarEmbed(msg, user)
	}
}
export function Invite(msg) {
	msg.author.send("Ты можешь пустить меня на свой сервер с помощью этой ссылки: \n<https://discordapp.com/api/oauth2/authorize?client_id=" + BOT_ID + "&scope=bot&permissions=0>")
		.then(() => {
			s.envelope(msg)
		})
		.catch(error => console.log(error))
}
export function Uptime(msg) {

	let diff = Date.now() - readyTime
	let tarr = [1000, 60, 60, 24]
	for (let i in tarr) {
		let x = tarr[i]
		tarr[i] = diff % x
		diff = (diff - tarr[i]) / x
	}
	tarr.push(diff)
	tarr.shift()
	let warr = [
		['секунду', 'секунды', 'секунд'],
		['минуту', 'минуты', 'минут'],
		['час', 'часа', 'часов'],
		['день', 'дня', 'дней'],
	]
	let sarr = []
	for (let i = tarr.length - 1; i >= 0; i--) {
		if (!tarr[i]) {
			continue
		}
		sarr.push(tarr[i] + ' ' + s.pluralize(tarr[i], warr[i]))
	}

	msg.channel.send("Я работаю уже " + sarr.join(', ') + '.')
}
export async function Homestuck(msg, args, msgCommandOriginal, usedArrowButton) {
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖")
		return
	}

	let page_number

	if (args[0]) {
		if (Number(args[0]) >= 1 && Number(args[0]) <= 8130) {
			page_number = args[0]
		} else {
			return
		}
	} else {
		page_number = 1
	}

	let page_link = 'https://www.homestuck.com/story/' + page_number
  let comic_number = "hs#" + page_number
  let got_error_already = false
	let embed_color = 0x249E28

	let comic_embed = {
		color: embed_color,
		author: {
			url: page_link,
			name: comic_number
		}
	}

	try {
		let hs = await got(page_link, {
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0"
			}
		})

		let $ = Cheerio.load(hs.body)

		let content_container = $('div#content_container')
		let flash_div = $('div#o_flash-container')

		// detecting video
		let is_there_video = false
		let yt_link = ""
		let yt_link_code

		if (flash_div.length) {
			let yt_raw = flash_div.html().match(/\'youtubeid\', \'(.+)\'/)
			if (yt_raw) {
				yt_link_code = yt_raw[1]
			}
		} else {
			let yt_raw = $('iframe.ar-inner').attr('src')
			if (yt_raw) {
				yt_link_code = yt_raw.match(/embed\/(.+)/)[1]
			}
		}
		if (yt_link_code) {
			yt_link = `https://youtu.be/${yt_link_code}`
			is_there_video = true
		}


		if (is_there_video) {
			// send title, desc and video link
			s.showHomestuckPage(msg, {}, usedArrowButton, comic_number + "\n" + yt_link)
		} else {
			// getting title
			let comic_title = $('h2.type-hs-header').text()
			if (comic_title && !is_there_video) {
				comic_title = `${comic_title} (${comic_number})`
			} else {
				comic_title = comic_number
			}
			comic_embed.author.name = comic_title

			// getting description
			let desc = $('p.type-rg').text().replace(/\ +/g, " ").replace(/^\s+/, "").replace(/\s+$/, "")
			let desc_limit = 2047
			if (desc.length > desc_limit) {
				desc = desc.substring(0, desc_limit) + "…"
			} else if (desc.length == 0) {
				desc = ""
			}
			comic_embed.description = desc

			// getting images
			let imgs
			let img_link = ""
			let is_img_from_flash = false
			if (content_container.length) {
				imgs = content_container.find('img.mar-x-auto.disp-bl')
				if (!imgs.length) {
					let imgs_raw = $('div.bg-scratch-mid-green.pad-t-lg').find('img')
					if (imgs_raw.length) {
						imgs = imgs_raw.attr('src')
						is_img_from_flash = true
					}
				}
			} else {
				imgs = $('img.mar-x-auto.disp-bl')
			}
			if (flash_div.length && !imgs.length) {
				let imgs_raw = flash_div.html().match(/\'altimgsrc\', \'(.+)\'/)
				if (imgs_raw) {
					imgs = imgs_raw[1]
					is_img_from_flash = true
				}
			}
			if (imgs.length) {
				// send title, image and desc
				if (is_img_from_flash) {
					img_link = `https://www.homestuck.com${imgs}`
				} else if (imgs.attr('src').startsWith("/")) {
					img_link = `https://www.homestuck.com${imgs.attr('src')}`
				} else {
					img_link = imgs.attr('src')
				}

				comic_embed.image = {url: img_link}
			} else {
				// send title and footer
				comic_embed.footer = {text: "It's probably interactive."}
			}
			s.showHomestuckPage(msg, comic_embed, usedArrowButton, "")
		}
	} catch (err) {
		if (err.statusCode === 404) {
			comic_embed.footer = {text: "It's probably missing page."}
			s.showHomestuckPage(msg, comic_embed, usedArrowButton, "")
		}
	}
}
export function CinemaPing(msg) {
	if (![OWNER_ID, "184388744558673920", "378318866524143627", "178833086530846720"].includes(msg.author.id)) {
		return
	}

	let cinemaPing = ""
	client.channels.get("541594001992581122").fetchMessage("542389154424553549")
		.then((message) => {
			message.reactions.get("📽").fetchUsers()
				.then((users) => {
					users.forEach(user => {
						cinemaPing += "<@" + user.id + ">\n"
					})
					cinemaPing += "Приглашаем вас на сегодняшний сеанс!"
					msg.channel.send(cinemaPing)
				})
				.catch(error => console.log(error))
		})
		.catch(error => console.log(error))
}
export function SnowflakeTime(msg, args) {
	let totalSFTimes = ""
	args.forEach(arg => {
		if (arg.match(/\d{17,20}/)) {
			let totalMatches = arg.match(/\d{17,20}/g)
			for (let i in totalMatches) {
				totalSFTimes += s.dateStr(s.sfTime(Number(totalMatches[i]))) + "\n"
			}
		}
	})
	if (totalSFTimes) {
		msg.channel.send(totalSFTimes)
	}
}
export function Stats(msg) {
	const statsLines = [
		"Серверов: " + client.guilds.size,
		"Эмоджи: " + client.emojis.size,
		"Юзеров в кэше: " + client.users.size,
		"Запросов за эту сессию: " + requestsCounter
	]

	const statsEmbed = {
		color: 0x888888,
		title: "Статистика",
		description: statsLines.join("\n")
	}

	msg.channel.send({embed: statsEmbed})
}
export function When(msg, args, msgCommandOriginal) {
	if (!args[0]) {
		return
	}

	let questionOriginal = msgCommandOriginal.match(/\S+ ([\s\S]+)/)[1].replace(/[.!?]+$/, "")
	let question = questionOriginal.toLowerCase().replace(/ё/g, "е")

	let epochStart = 17999
	let epochEnd = 65573
	let T = epochEnd - epochStart

	let days = Math.floor(Math.pow(((s.hashCode(question) % T) / T), 6) * T) + epochStart
	if (question.match(/(железн(ая|ой|ую) двер(ь|и)|конец света|армагеддон|апокалипсис)/)) {
		days = epochEnd
	}

	let whenEmbed = {
		title: "Когда " + questionOriginal + "?",
	}

	let dateOptions = {year: "numeric", month: "long", day: "numeric"}
	let dateText

	if (days == epochStart) {
		dateText = "Сегодня."
	} else if (days == epochStart + 1) {
		dateText = "Завтра."
	} else if (days > epochEnd - 1000 && days < epochEnd) {
		dateText = "Никогда."
	} else if (question == "когда") {
		dateText = "Тогда."
	} else {
		dateText = new Intl.DateTimeFormat("ru", dateOptions).format(new Date(days*86400*1000))
	}
	whenEmbed.description = "🗓 " + dateText

	msg.channel.send({embed: whenEmbed})
}
export function IronDoor(msg, args) {
	if (!args[0]) {
		return
	}

	let possibleAnswers = [
		"Бесспорно.", 
		"Определённо, да.",
		"Без сомнения.",
		"Конечно.",

		"Думаю, да.",
		"Наверное.",
		"Вполне вероятно.",
		"Возможно, так и есть.",
		"А сам как думаешь?",

		"ХЗ, вообще.",
		"Вселенная не может подсказать мне сейчас.",
		"Неясно.",
		"Попробуй сформулировать вопрос по-другому.",
		"Может быть.",
		"Не могу сейчас сказать точно.",
		"Попробуй подумать сам.",
		"Что за странный вопрос?",
		"Не могу сказать сейчас.",
		"Лучше бы тебе не знать об этом.",
		"Откуда мне знать?",
		"50 на 50.",

		"Скорее всего, нет.",
		"Да вряд ли.",
		"Маловероятно.",
		"Вероятность - околонулевая.",

		"Конечно, нет.",
		"Мои источники говорят: \"нет\".",
		"Вероятность - нулевая.",
		"Вселенная так не думает."
	]

	let embed = {
		author: {
			name: s.getRandomElem(possibleAnswers),
			icon_url: "https://i.imgur.com/P8IAywM.png"
		}
	}

	msg.channel.send({embed: embed})
}
