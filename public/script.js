const welcomeScreen = document.getElementById('welcomeScreen')
const chatScreen = document.getElementById('chatScreen')

const chat = document.getElementById('chat')
const nextStrangerBtn = document.getElementById('nextStrangerBtn')

const socket = io()
const searchingScreen = document.getElementById('searchingScreen')

const findStrangerBtn = document.getElementById('findStrangerBtn')
const leaveChatBtn = document.getElementById('leaveChatBtn')

const emojiBar = document.getElementById('emojiBar')
const defaultEmojis = [
  { type: 'text', value: '👋', default: true },
  { type: 'text', value: '😭', default: true },
  { type: 'text', value: '💀', default: true },
  { type: 'text', value: '🔥', default: true },
  { type: 'text', value: '🗿', default: true }
]

let generatedEmojis = []

const generatePanel = document.getElementById('generatePanel')
const generateTitle = document.getElementById('generateTitle')
const generatePromptInput = document.getElementById('generatePromptInput')
const generateEmojiBtn = document.getElementById('generateEmojiBtn')
const cancelGenerateBtn = document.getElementById('cancelGenerateBtn')

let currentUsername = 'Anonymous'
let selectedBaseEmoji = null
let isMatched = false

async function convertImageToPNG (url) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = url

  await img.decode()

  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, size, size)

  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const isNearWhite = r > 240 && g > 240 && b > 240

    if (isNearWhite) {
      data[i + 3] = 0
    }
  }

  ctx.putImageData(imageData, 0, 0)

  return canvas.toDataURL('image/png')
}

function clearChat () {
  chat.innerHTML = ''
}

function startSearching () {
  if (!currentUsername || currentUsername.trim() === '') {
    currentUsername = 'Anonymous'
  }

  isMatched = false
  updateChatAvailability()
  clearChat()
  showScreen(searchingScreen)
  socket.emit('find-stranger')
}

function showScreen (screenToShow) {
  welcomeScreen.classList.add('hidden')
  signupScreen.classList.add('hidden')
  searchingScreen.classList.add('hidden')
  chatScreen.classList.add('hidden')

  screenToShow.classList.remove('hidden')
}

function updateChatAvailability () {
  const emojiButtons = document.querySelectorAll('.emoji-btn')

  emojiButtons.forEach(button => {
    button.disabled = !isMatched
    button.style.opacity = isMatched ? '1' : '0.5'
    button.style.pointerEvents = isMatched ? 'auto' : 'none'
  })
}

function saveGeneratedEmojis () {
  localStorage.setItem('generatedEmojis', JSON.stringify(generatedEmojis))
}

function loadGeneratedEmojis () {
  const savedEmojis = localStorage.getItem('generatedEmojis')

  if (savedEmojis) {
    generatedEmojis = JSON.parse(savedEmojis)
  }
}

function renderEmojis () {
  emojiBar.innerHTML = ''

  const allEmojis = [...defaultEmojis, ...generatedEmojis]

  allEmojis.forEach((emojiItemData, index) => {
    const emojiItem = document.createElement('div')
    emojiItem.classList.add('emoji-item')

    const emojiButton = document.createElement('button')
    emojiButton.classList.add('emoji-btn')

    if (emojiItemData.type === 'text') {
      emojiButton.textContent = emojiItemData.value
    } else if (emojiItemData.type === 'image') {
      const img = document.createElement('img')
      img.src = emojiItemData.value
      img.alt = 'Generated emoji'
      img.classList.add('generated-emoji-img')
      emojiButton.appendChild(img)
    }

    let pressTimer = null
    let longPressTriggered = false

    emojiButton.addEventListener('touchstart', () => {
      longPressTriggered = false

      pressTimer = setTimeout(() => {
        longPressTriggered = true
        openGeneratePanel(emojiItemData)
      }, 500)
    })

    emojiButton.addEventListener('touchend', () => {
      clearTimeout(pressTimer)

      if (!longPressTriggered) {
        sendEmoji(emojiItemData)
      }
    })

    emojiButton.addEventListener('touchmove', () => {
      clearTimeout(pressTimer)
    })

    emojiButton.onclick = () => {
      sendEmoji(emojiItemData)
    }

    const generateButton = document.createElement('button')
    generateButton.classList.add('generate-from-btn')
    generateButton.textContent = '✨'

    generateButton.onclick = event => {
      event.stopPropagation()
      openGeneratePanel(emojiItemData)
    }

    emojiItem.appendChild(emojiButton)
    emojiItem.appendChild(generateButton)

    if (!emojiItemData.default) {
      const deleteButton = document.createElement('button')
      deleteButton.classList.add('delete-emoji-btn')
      deleteButton.textContent = '✖'

      deleteButton.onclick = event => {
        event.stopPropagation()
        deleteGeneratedEmoji(index - defaultEmojis.length)
      }

      emojiItem.appendChild(deleteButton)
    }

    emojiBar.appendChild(emojiItem)
  })
}

findStrangerBtn.onclick = () => {
  showScreen(searchingScreen)
  socket.emit('find-stranger')
}

nextStrangerBtn.onclick = () => {
  socket.emit('leave-chat')
  startSearching()
}

leaveChatBtn.onclick = () => {
  socket.emit('leave-chat')
  isMatched = false
  updateChatAvailability()
  clearChat()
  showScreen(welcomeScreen)
}

function addSystemMessage (text) {
  const div = document.createElement('div')
  div.classList.add('system-message')
  div.textContent = text

  chat.appendChild(div)
  chat.scrollTop = chat.scrollHeight
}

socket.on('system-message', text => {
  if (text === 'A stranger has disconnected.') {
    isMatched = false
    updateChatAvailability()
    addSystemMessage(text)
    return
  }

  if (text === 'You left the chat.') {
    isMatched = false
    updateChatAvailability()
    return
  }

  addSystemMessage(text)
})

socket.on('matched', () => {
  isMatched = true
  updateChatAvailability()
  clearChat()
  showScreen(chatScreen)
  addSystemMessage('You are now connected to a stranger.')
})

socket.on('chat-message', messageData => {
  const messageWrapper = document.createElement('div')
  messageWrapper.classList.add('message-wrapper')

  if (messageData.senderId === socket.id) {
    messageWrapper.classList.add('my-message')
  } else {
    messageWrapper.classList.add('other-message')
  }

  const usernameDiv = document.createElement('div')
  usernameDiv.classList.add('message-username')
  usernameDiv.textContent =
    messageData.senderId === socket.id ? 'You' : 'Stranger'

  const messageBubble = document.createElement('div')
  messageBubble.classList.add('message-bubble')

  if (messageData.emoji) {
    if (messageData.emoji.type === 'text') {
      const emojiDiv = document.createElement('div')
      emojiDiv.classList.add('message-emoji')
      emojiDiv.textContent = messageData.emoji.value
      messageBubble.appendChild(emojiDiv)
    } else if (messageData.emoji.type === 'image') {
      const img = document.createElement('img')
      img.src = messageData.emoji.value
      img.alt = 'Emoji'
      img.classList.add('chat-emoji-img')
      messageBubble.appendChild(img)
    }
  }

  messageWrapper.appendChild(usernameDiv)
  messageWrapper.appendChild(messageBubble)

  chat.appendChild(messageWrapper)
  chat.scrollTop = chat.scrollHeight
})

function deleteGeneratedEmoji (index) {
  generatedEmojis.splice(index, 1)
  saveGeneratedEmojis()
  renderEmojis()
}

function openGeneratePanel (emojiItemData) {
  selectedBaseEmoji = emojiItemData

  generateTitle.innerHTML = ''

  const labelSpan = document.createElement('span')
  labelSpan.textContent = 'Generate from '

  generateTitle.appendChild(labelSpan)

  if (emojiItemData.type === 'text') {
    const emojiSpan = document.createElement('span')
    emojiSpan.classList.add('generate-title-emoji')
    emojiSpan.textContent = emojiItemData.value
    generateTitle.appendChild(emojiSpan)
  } else if (emojiItemData.type === 'image') {
    const img = document.createElement('img')
    img.src = emojiItemData.value
    img.alt = 'Custom emoji'
    img.classList.add('generate-title-img')
    generateTitle.appendChild(img)
  }

  generatePromptInput.value = ''
  generatePanel.classList.remove('hidden')
}

function closeGeneratePanel () {
  selectedBaseEmoji = null
  generatePanel.classList.add('hidden')
}

async function generateFakeEmoji () {
  const prompt = generatePromptInput.value.trim()

  if (prompt === '' || selectedBaseEmoji === null) {
    return
  }

  const baseEmojiValue =
    selectedBaseEmoji.type === 'text'
      ? selectedBaseEmoji.value
      : selectedBaseEmoji.base || 'custom emoji'

  const fullPrompt = `
Create a single tiny emoji-style sticker icon inspired by "${baseEmojiValue}".
Important rules:
- transparent background
- no white background
- no solid background
- only the subject/icon visible
- centered composition
- square image
- sticker style
- readable at small size
User idea: ${prompt}
`

  try {
    generateEmojiBtn.disabled = true
    generateEmojiBtn.textContent = 'Generating...'

    const img = await puter.ai.txt2img(fullPrompt)

    const imageSrc = await convertImageToPNG(img.src)

    generatedEmojis.push({
      type: 'image',
      value: imageSrc,
      default: false,
      base: baseEmojiValue,
      prompt: prompt
    })

    saveGeneratedEmojis()

    renderEmojis()
    closeGeneratePanel()
  } catch (error) {
    console.error('Puter image generation error:', error)
    alert('Image generation failed.')
  } finally {
    generateEmojiBtn.disabled = false
    generateEmojiBtn.textContent = 'Generate'
  }
}

function sendEmoji (emojiItemData) {
  if (!isMatched) {
    return
  }

  socket.emit('chat-message', {
    username: currentUsername,
    emoji: emojiItemData
  })
}

generateEmojiBtn.onclick = generateFakeEmoji
cancelGenerateBtn.onclick = closeGeneratePanel

loadGeneratedEmojis()
renderEmojis()
updateAuthUI()
updateChatAvailability()
