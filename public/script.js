const welcomeScreen = document.getElementById('welcomeScreen')
const loginScreen = document.getElementById('loginScreen')
const signupScreen = document.getElementById('signupScreen')
const chatScreen = document.getElementById('chatScreen')
const loginTopBtn = document.getElementById('loginTopBtn')

const anonymousBtn = document.getElementById('anonymousBtn')
const showLoginBtn = document.getElementById('showLoginBtn')
const showSignupBtn = document.getElementById('showSignupBtn')
const backFromLoginBtn = document.getElementById('backFromLoginBtn')
const backFromSignupBtn = document.getElementById('backFromSignupBtn')
const loginBtn = document.getElementById('loginBtn')
const signupBtn = document.getElementById('signupBtn')
const logoutBtn = document.getElementById('logoutBtn')

const chat = document.getElementById('chat')
const input = document.getElementById('messageInput')
const sendBtn = document.getElementById('sendBtn')

const socket = io()

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

function showScreen (screenToShow) {
  welcomeScreen.classList.add('hidden')
  loginScreen.classList.add('hidden')
  signupScreen.classList.add('hidden')
  chatScreen.classList.add('hidden')

  screenToShow.classList.remove('hidden')
}

function updateAuthUI () {
  if (currentUsername === 'Anonymous') {
    loginTopBtn.classList.remove('hidden')
    logoutBtn.classList.add('hidden')
  } else {
    loginTopBtn.classList.add('hidden')
    logoutBtn.classList.remove('hidden')
  }
}

function sendMessage() {
  const message = input.value.trim();

  if (message === '') {
    return;
  }

  socket.emit('chat-message', {
    username: currentUsername,
    text: message
  });

  input.value = '';
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
  socket.emit('find-stranger')
}

leaveChatBtn.onclick = () => {
  socket.emit('leave-chat')
}

function addSystemMessage(text) {
  const div = document.createElement('div');
  div.classList.add('system-message');
  div.textContent = text;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

socket.on('system-message', text => {
  addSystemMessage(text)
})

socket.on('matched', () => {
  addSystemMessage('You are now connected to a stranger.')
})

socket.on('chat-message', (messageData) => {
  const messageWrapper = document.createElement('div');
  messageWrapper.classList.add('message-wrapper');

  const messageBubble = document.createElement('div');
  messageBubble.classList.add('message-bubble');

  if (messageData.username === currentUsername) {
    messageWrapper.classList.add('my-message');
  } else {
    messageWrapper.classList.add('other-message');
  }

  const usernameDiv = document.createElement('div');
  usernameDiv.classList.add('message-username');
  usernameDiv.textContent = messageData.username;

  const textDiv = document.createElement('div');
  textDiv.classList.add('message-text');
  textDiv.textContent = messageData.text;

  messageBubble.appendChild(usernameDiv);
  messageBubble.appendChild(textDiv);

  messageWrapper.appendChild(messageBubble);

  chat.appendChild(messageWrapper);
  chat.scrollTop = chat.scrollHeight;
});

function deleteGeneratedEmoji (index) {
  generatedEmojis.splice(index, 1)
  saveGeneratedEmojis()
  renderEmojis()
}

function closeGeneratePanel () {
  selectedBaseEmoji = null
  generatePanel.classList.add('hidden')
}

function openGeneratePanel (emojiItemData) {
  selectedBaseEmoji = emojiItemData

  let label = 'generated emoji'

  if (emojiItemData.type === 'text') {
    label = emojiItemData.value
  } else if (emojiItemData.type === 'image' && emojiItemData.base) {
    label = emojiItemData.base
  }

  generateTitle.textContent = `Generate from ${label}`
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
  const div = document.createElement('div')
  div.classList.add('message')

  const usernameSpan = document.createElement('span')
  usernameSpan.textContent = `${currentUsername}: `
  div.appendChild(usernameSpan)

  if (emojiItemData.type === 'text') {
    const emojiSpan = document.createElement('span')
    emojiSpan.textContent = emojiItemData.value
    div.appendChild(emojiSpan)
  } else if (emojiItemData.type === 'image') {
    const img = document.createElement('img')
    img.src = emojiItemData.value
    img.alt = 'Generated emoji'
    img.classList.add('chat-emoji-img')
    div.appendChild(img)
  }

  chat.appendChild(div)
  chat.scrollTop = chat.scrollHeight
}

generateEmojiBtn.onclick = generateFakeEmoji
cancelGenerateBtn.onclick = closeGeneratePanel

anonymousBtn.onclick = () => {
  currentUsername = 'Anonymous'
  updateAuthUI()
  showScreen(chatScreen)
}

showLoginBtn.onclick = () => {
  showScreen(loginScreen)
}

showSignupBtn.onclick = () => {
  showScreen(signupScreen)
}

backFromLoginBtn.onclick = () => {
  showScreen(welcomeScreen)
}

backFromSignupBtn.onclick = () => {
  showScreen(welcomeScreen)
}

loginBtn.onclick = () => {
  const loginUsername = document.getElementById('loginUsername').value.trim()

  if (loginUsername === '') {
    alert('Please enter a username.')
    return
  }

  currentUsername = loginUsername
  updateAuthUI()
  showScreen(chatScreen)
}

signupBtn.onclick = () => {
  const signupUsername = document.getElementById('signupUsername').value.trim()

  if (signupUsername === '') {
    alert('Please enter a username.')
    return
  }

  currentUsername = signupUsername
  updateAuthUI()
  showScreen(chatScreen)
}

logoutBtn.onclick = () => {
  currentUsername = 'Anonymous'
  updateAuthUI()
  showScreen(welcomeScreen)
}

loginTopBtn.onclick = () => {
  showScreen(loginScreen)
}

sendBtn.onclick = sendMessage

input.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    sendMessage()
  }
})

loadGeneratedEmojis()
renderEmojis()
updateAuthUI()
