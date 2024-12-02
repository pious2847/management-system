let arrow = document.querySelectorAll(".arrow");
for (var i = 0; i < arrow.length; i++) {
  arrow[i].addEventListener("click", (e)=>{
 let arrowParent = e.target.parentElement.parentElement;//selecting main parent of arrow
 arrowParent.classList.toggle("showMenu");
  });
}
let sidebar = document.getElementById("sidebar");
let sidebarBtn = document.getElementById("menus");

if (window.innerWidth <= 768) {
  sidebarBtn.addEventListener("click", () => {
    sidebar.classList.toggle("close");
    console.log('done');
    sidebar.classList.toggle("heights-container");
  });
} else {
  sidebarBtn.addEventListener("click", ()=>{
    sidebar.classList.toggle("close");
  });
}
