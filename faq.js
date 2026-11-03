const questionInput = document.getElementById("faq-question");

document.querySelectorAll(".sample-question").forEach((button) => {
  button.addEventListener("click", () => {
    questionInput.value = button.dataset.question;
    questionInput.focus();
  });
});
