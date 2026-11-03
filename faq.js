const API_URL = "http://127.0.0.1:8000/api/ask";

const questionInput = document.getElementById("faq-question");
const chatMessages = document.getElementById("chat-messages");
const form = document.getElementById("faq-form");
const submitButton = form.querySelector('button[type="submit"]');

function addMessage(className, text) {
  const message = document.createElement("p");
  message.className = className;
  message.textContent = text;
  chatMessages.appendChild(message);
  return message;
}

// Clicking a sample fills the box so the visitor can review it.
document.querySelectorAll(".sample-question").forEach((button) => {
  button.addEventListener("click", () => {
    questionInput.value = button.dataset.question;
    questionInput.focus();
  });
});

// Submitting sends the question to the local Python API.
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  if (!question) return;

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
      const citations = result.sources
        .map((source) => `${source.title}, pagina ${source.pages.join(", ")}`)
        .join("; ");

      addMessage("chat-source", `Bron: ${citations}`);
    }

    questionInput.value = "";
  } catch (error) {
    answerMessage.textContent =
      `Kan geen verbinding maken met de chatbot: ${error.message}`;
  } finally {
    submitButton.disabled = false;
    questionInput.focus();
  }
});
