const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const button = document.getElementById("sendBtn");

function sendMessage() {
  const message = input.value.trim();

  if (message === "") {
    return;
  }

  const div = document.createElement("div");
  div.classList.add("message");
  div.textContent = message;

  chat.appendChild(div);

  input.value = "";
  chat.scrollTop = chat.scrollHeight;
}

button.onclick = sendMessage;

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});