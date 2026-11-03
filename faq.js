const API_URL = "http://127.0.0.1:8000/api/ask";
const GUIDE_PDF_URL = "adoption-guide.pdf";

const questionInput = document.getElementById("faq-question");
const chatMessages = document.getElementById("chat-messages");
const form = document.getElementById("faq-form");
const submitButton = form.querySelector('button[type="submit"]');

let currentLanguage = "nl";

const interfaceText = {
  nl: {
    back: "Terug naar de honden",
    eyebrow: "Post-adoptie FAQ",
    heading: "Vragen na adoptie?",
    intro: "Stel een vraag over de eerste weken met je hond.",
    samples: "Voorbeeldvragen",
    moreSamples: "Meer voorbeeldvragen",
    greeting: "Hallo! Ik kan helpen met vragen over de informatie in onze adoptiegids.",
    yourQuestion: "Jouw vraag",
    submit: "Verstuur",
    questionPrefix: "Jouw vraag",
    loading: "Antwoord ophalen…",
    source: "Bron",
    connectionError: "Kan geen verbinding maken met de chatbot",
    genericError: "Er ging iets mis.",
  },
  en: {
    back: "Back to the dogs",
    eyebrow: "Post-adoption FAQ",
    heading: "Questions after adoption?",
    intro: "Ask a question about your dog's first weeks at home.",
    samples: "Sample questions",
    moreSamples: "More sample questions",
    greeting: "Hello! I can help with questions about the information in our adoption guide.",
    yourQuestion: "Your question",
    submit: "Submit",
    questionPrefix: "Your question",
    loading: "Getting an answer…",
    source: "Source",
    connectionError: "Could not connect to the chatbot",
    genericError: "Something went wrong.",
  },
};

function setLanguage(language) {
  currentLanguage = language;
  const text = interfaceText[language];

  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = text[element.dataset.i18n];
  });

  document.querySelectorAll(".sample-question").forEach((button) => {
    const label =
      button.dataset[`label${language === "nl" ? "Nl" : "En"}`];
    if (label) button.textContent = label;
  });

  const placeholder =
    questionInput.dataset[`placeholder${language === "nl" ? "Nl" : "En"}`];
  if (placeholder) questionInput.placeholder = placeholder;

  document.querySelectorAll(".language-button").forEach((button) => {
    const selected = button.dataset.language === language;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

document.querySelectorAll(".language-button").forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.language);
  });
});

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

function addSourceLinks(sources, sourceLabel) {
  const message = document.createElement("p");
  message.className = "chat-source";
  message.append(document.createTextNode(`${sourceLabel}: `));

  sources.forEach((source, index) => {
    if (index) message.append(document.createTextNode("; "));

    const pages = source.pages || [];
    const pageLabel =
      currentLanguage === "en"
        ? pages.length === 1
          ? "page"
          : "pages"
        : "pagina";

    const link = document.createElement("a");
    link.href = `${GUIDE_PDF_URL}#page=${pages[0] || 1}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent =
      `${source.title}, ${pageLabel} ${pages.join(", ")}`;

    message.append(link);
  });

  chatMessages.appendChild(message);
}

// Clicking a sample question sends it to the RAG API.
document.querySelectorAll(".sample-question").forEach((button) => {
  button.addEventListener("click", () => {
    const language =
      document.documentElement.lang === "en" ? "En" : "Nl";

    const question =
      button.dataset[`question${language}`] ||
      button.dataset.question ||
      button.dataset.questionEn ||
      "";

    if (!question.trim()) return;

    questionInput.value = question;
    form.requestSubmit();
  });
});

// Typed questions also go to the RAG API.
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  if (!question) return;

  clearPreviousAnswer();

  const text = interfaceText[currentLanguage];
  addMessage("chat-user", `${text.questionPrefix}: ${question}`);

  const answerMessage = addMessage("chat-answer", text.loading);
  submitButton.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || text.genericError);
    }

    answerMessage.textContent = result.answer;

    if (result.sources?.length) {
      addSourceLinks(result.sources, text.source);
    }
  } catch (error) {
    answerMessage.textContent =
      `${text.connectionError}: ${error.message || text.genericError}`;
  } finally {
    submitButton.disabled = false;
    questionInput.value = "";
    questionInput.focus();
  }
});

setLanguage("nl");
