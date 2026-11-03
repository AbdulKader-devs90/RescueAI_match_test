const API_URL = "http://127.0.0.1:8000/api/ask";\
const GUIDE_PDF_URL = "adoption-guide.pdf";

const questionInput = document.getElementById("faq-question");
const chatMessages = document.getElementById("chat-messages");
const form = document.getElementById("faq-form");
const submitButton = form.querySelector('button[type="submit"]');

function clearPreviousAnswer() {
  chatMessages
    .querySelectorAll(".chat-user, .chat-answer, .chat-source")
    .forEach((message) => message.remove());
}

function addMessage(className, text) {
  const message = document.createElement("p");
  message.className = className;
  message.textContent = text;
  message.style.whiteSpace = "pre-line";
  chatMessages.appendChild(message);
  return message;
}
function addSourceLinks(sources) {
  const language = document.documentElement.lang || "nl";
  const label = language === "en" ? "Source: " : "Bron: ";
  const message = document.createElement("p");
  message.className = "chat-source";
  message.append(document.createTextNode(label));

  sources.forEach((source, index) => {
    if (index) message.append(document.createTextNode("; "));

    const pages = source.pages || [];
    const pageLabel = language === "en"
      ? (pages.length === 1 ? "page" : "pages")
      : "pagina";

    const link = document.createElement("a");
    link.href = `adoption-guide.pdf#page=${pages[0] || 1}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent =
      `${source.title}, ${pageLabel} ${pages.join(", ")}`;
    message.append(link);
  });

  chatMessages.appendChild(message);
}
// Clicking a sample asks the RAG chatbot immediately.
document.querySelectorAll(".sample-question").forEach((button) => {
  button.addEventListener("click", () => {
    questionInput.value = button.dataset.question || "";
    form.requestSubmit();
  });
});

// Typed questions also go to the RAG API.
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  if (!question) return;

  clearPreviousAnswer();
  addMessage("chat-user", `Jouw vraag: ${question}`);
  const answerMessage = addMessage("chat-answer", "Antwoord ophalen…");
  submitButton.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Er ging iets mis.");
    }

    answerMessage.textContent = result.answer;

    if (result.sources?.length) {
  addSourceLinks(result.sources);
}


  } catch (error) {
    answerMessage.textContent =
      `Kan geen verbinding maken met de chatbot: ${error.message}`;
  } finally {
    submitButton.disabled = false;
    questionInput.value = "";
    questionInput.focus();
  }
});
