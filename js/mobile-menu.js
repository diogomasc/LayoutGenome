document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");
  const body = document.body;

  if (!menuToggle || !navLinks) return;

  const closeMenu = () => {
    menuToggle.classList.remove("active");
    navLinks.classList.remove("active");
    body.classList.remove("menu-open");
  };

  const toggleMenu = () => {
    menuToggle.classList.toggle("active");
    navLinks.classList.toggle("active");
    body.classList.toggle("menu-open");
  };

  menuToggle.addEventListener("click", toggleMenu);

  const links = navLinks.querySelectorAll("a");
  links.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
});
