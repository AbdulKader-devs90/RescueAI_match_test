const API_URL = "https://rescueai-post-adoption-api.onrender.com/api/ask";
const API_BASE = API_URL.replace(/\/api\/ask$/, "");
const GUIDE_PDF_URL = "adoption-guide.pdf";
const DOGSEARCH_PHONE = "06 50485952"; // from the adoption guide, section 6

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
    escalation: {
      emergencyTitle: "Dit klinkt als een noodgeval",
      emergencyAction:
        "Wacht niet op de chat: bel nu je eigen dierenarts of de spoeddienst van een dierenarts.",
      missingAction: `Bel direct Dogsearch (${DOGSEARCH_PHONE}) en meld het in de DOAJ WhatsApp-groep.`,
      urgentTitle: "Een vrijwilliger kijkt met je mee",
      urgentAction:
        "Dit is iets waar een vrijwilliger van Dogs on a Journey graag persoonlijk bij helpt.",
      notified: "We hebben een vrijwilliger gewaarschuwd.",
      notNotified:
        "We konden de vrijwilligers niet automatisch bereiken. Neem zelf contact op via de DOAJ WhatsApp-groep.",
      ticket: "Referentie",
      formIntro: "Laat je naam en telefoonnummer achter, dan neemt een vrijwilliger contact met je op.",
      name: "Naam",
      phone: "Telefoon / WhatsApp",
      note: "Extra informatie (optioneel)",
      send: "Stuur naar vrijwilliger",
      sending: "Versturen…",
      sent: "Bedankt. Een vrijwilliger neemt zo snel mogelijk contact met je op.",
      sendError: "Versturen lukte niet. Neem contact op via de DOAJ WhatsApp-groep.",
      privacy: "We gebruiken je gegevens alleen om over deze vraag contact op te nemen.",
      checkFailed:
        "Twijfel je of het dringend is? Neem dan direct contact op met Dogs on a Journey of je dierenarts.",
    },
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
    escalation: {
      emergencyTitle: "This sounds like an emergency",
      emergencyAction: "Don't wait for the chat: call your own vet or an emergency vet now.",
      missingAction: `Call Dogsearch now (${DOGSEARCH_PHONE}) and post in the DOAJ WhatsApp group.`,
      urgentTitle: "A volunteer will help you with this",
      urgentAction: "This is something a Dogs on a Journey volunteer should help you with personally.",
      notified: "We have alerted a volunteer.",
      notNotified:
        "We could not reach the volunteers automatically. Please contact us through the DOAJ WhatsApp group.",
      ticket: "Reference",
      formIntro: "Leave your name and phone number and a volunteer will contact you.",
      name: "Name",
      phone: "Phone / WhatsApp",
      note: "Anything else we should know (optional)",
      send: "Send to volunteer",
      sending: "Sending…",
      sent: "Thank you. A volunteer will contact you as soon as possible.",
      sendError: "Sending failed. Please contact us through the DOAJ WhatsApp group.",
      privacy: "We only use your details to contact you about this question.",
      checkFailed:
        "Not sure if this is urgent? Contact Dogs on a Journey or your vet directly.",
    },
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
    const label = button.dataset[`label${language === "nl" ? "Nl" : "En"}`];
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
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

function clearPreviousAnswer() {
  chatMessages
    .querySelectorAll(".chat-user, .chat-answer, .chat-source, .chat-escalation")
    .forEach((message) => message.remove());
}

function addMessage(className, text) {
  const tagName = className === "chat-answer" ? "div" : "p";
  const message = document.createElement(tagName);
  message.className = className;
  message.textContent = text;
  message.style.whiteSpace = "pre-line";
  chatMessages.appendChild(message);
  return message;
}

function renderAnswer(element, answer) {
  // The clickable source link below the answer is the citation.
  // Remove duplicate citation lines from the generated answer.
  const lines = String(answer || "")
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*\*{0,2}\s*(?:bron|source)\s*[:\uFF1A].*\*{0,2}\s*$/i.test(line)
    );

  element.replaceChildren();
  let list = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      list = null;
      continue;
    }

    const bullet = line.match(
      /^[\u2022\u2023\u25E6\u2043\u2219*-]\s*(.+)$/u
    );

    if (bullet) {
      if (!list) {
        list = document.createElement("ul");
        element.appendChild(list);
      }

      const item = document.createElement("li");
      item.textContent = bullet[1].replace(/\*\*/g, "");
      list.appendChild(item);
      continue;
    }

    list = null;

    const paragraph = document.createElement("p");
    paragraph.textContent = line.replace(/\*\*/g, "");
    element.appendChild(paragraph);
  }
}

function addSourceLinks(sources, sourceLabel) {
  const message = document.createElement("p");
  message.className = "chat-source";
  message.append(document.createTextNode(`${sourceLabel}: `));

  sources.forEach((source, index) => {
    if (index) message.append(document.createTextNode("; "));

    const pages = source.pages || [];
    const pageWord =
      currentLanguage === "en"
        ? pages.length === 1
          ? "page"
          : "pages"
        : "pagina";

    const link = document.createElement("a");
    link.href = `${GUIDE_PDF_URL}#page=${pages[0] || 1}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `${source.title}, ${pageWord} ${pages.join(", ")}`;
    message.append(link);
  });

  chatMessages.appendChild(message);
}

// Escalation: the backend flags urgent cases, creates a ticket and alerts
// a volunteer. We show what to do now and let the adopter leave contact details.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderEscalation(escalation, beforeNode) {
  // Reply in the language the adopter wrote in, if the backend detected it.
  const language = interfaceText[escalation.language] ? escalation.language : currentLanguage;
  const t = interfaceText[language].escalation;

  if (!escalation.escalated) {
    if (escalation.check_failed) {
      const note = el("p", "chat-escalation chat-escalation-soft", t.checkFailed);
      chatMessages.insertBefore(note, beforeNode);
    }
    return;
  }

  const isEmergency = escalation.severity === "emergency";
  const card = el(
    "div",
    `chat-escalation ${isEmergency ? "is-emergency" : "is-urgent"}`
  );
  card.setAttribute("role", "alert");

  card.append(el("p", "escalation-title", isEmergency ? t.emergencyTitle : t.urgentTitle));

  if (escalation.category === "missing_dog") {
    card.append(el("p", "escalation-action", t.missingAction));
  } else if (isEmergency) {
    card.append(el("p", "escalation-action", t.emergencyAction));
  } else {
    card.append(el("p", null, t.urgentAction));
  }

  card.append(el("p", null, escalation.volunteer_notified ? t.notified : t.notNotified));

  if (escalation.ticket_id) {
    card.append(el("p", "escalation-ticket", `${t.ticket}: ${escalation.ticket_id}`));
    card.append(buildContactForm(escalation.ticket_id, t));
  }

  chatMessages.insertBefore(card, beforeNode);
}

function buildContactForm(ticketId, t) {
  const form = el("form", "escalation-form");
  form.append(el("p", null, t.formIntro));

  const fields = [
    ["name", t.name, "text", true, "name"],
    ["phone", t.phone, "tel", true, "tel"],
    ["note", t.note, "text", false, "off"],
  ];
  for (const [name, label, type, required, autocomplete] of fields) {
    const id = `esc-${name}-${ticketId}`;
    const labelEl = el("label", null, label);
    labelEl.htmlFor = id;
    const input = el("input");
    Object.assign(input, { id, name, type, required, autocomplete });
    form.append(labelEl, input);
  }

  const button = el("button", "primary", t.send);
  button.type = "submit";
  const status = el("p", "escalation-status");
  form.append(button, el("p", "escalation-privacy", t.privacy), status);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    status.textContent = t.sending;
    const data = Object.fromEntries(new FormData(form));
    if (!data.note) delete data.note;

    try {
      const response = await fetch(
        `${API_BASE}/api/escalations/${encodeURIComponent(ticketId)}/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error(String(response.status));
      form.replaceChildren(el("p", "escalation-status", t.sent));
    } catch {
      status.textContent = t.sendError;
      button.disabled = false;
    }
  });

  return form;
}

// Sample buttons send the selected question to the RAG API.
document.querySelectorAll(".sample-question").forEach((button) => {
  button.addEventListener("click", () => {
    const selectedLanguage =
      document.documentElement.lang === "en" ? "En" : "Nl";
    const questionKey = `question${selectedLanguage}`;

    questionInput.value =
      button.dataset[questionKey] ||
      button.dataset.question ||
      button.dataset.questionEn ||
      "";

    if (!questionInput.value.trim()) {
      console.error("Sample question is missing a data-question attribute.");
      return;
    }

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

    renderAnswer(answerMessage, result.answer);

    if (result.sources?.length) {
      addSourceLinks(result.sources, text.source);
    }

    // Urgent cases: show the escalation card above the guide answer.
    if (result.escalation) {
      renderEscalation(result.escalation, answerMessage);
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
