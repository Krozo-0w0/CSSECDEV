function toggleMenu() {
  let subMenu = document.getElementById("subMenu");

  subMenu.classList.toggle("open-menu");
}

function redirectToAbout() {
  window.location.href = '/about';
}

function redirectToProfile() {
    window.location.href = '/profile';
}

function redirectToLoginPage() {
    window.location.href='/';
}

function redirectToReservePage() {
    window.location.href = "../ReservePage/mainMenu.html";
}

function redirectToMainPage() {
    window.location.href = "/mainMenu";
}

function loadNav() {
    const navHtml = `
<link rel="stylesheet" href="/common/main.css">
<link rel="stylesheet" href="/common/mainMenu.css">
<link rel="stylesheet" href="/common/mainMenuBody.css">
<link rel="stylesheet" type="text/css" href="/common/navbar.css">


<nav>
    <header class="fixed">

    <div class="left">
        <img class = "clickableImage logo" onclick="redirectToMainPage()" src="/images/RESERVER (1).png" alt = "Clickable Image">
    </div>

    <div class="center">
        <div>
            <form class="search-container">
                <input class="fancySearchBox" type="search-input" placeholder="What are you looking for?">
                <button class= "searchButton" type="submit">Search</button>
            </form>
        </div>

    </div>

    <div class="right">
        <div class="profile" onclick="toggleMenu()"> 
            <img id="profile-image" src="/images/amogus.png" >
        </div>

        <div class="sub-menu-wrap" id="subMenu">
            <div class="sub-menu">
                <div class="sub-menu-profile"> 
                    <img id="profile-image" src="/images/amogus.png">
                    <div class="profile-detail">DLSU Student Name</div>
                    <div class="profile-detail">dlsu_email@dlsu.edu.ph</div>
                </div>
                <div class="sub-menu-navigation">
                    <table>
                        <tr onclick="redirectToProfile()">
                            <td class="sub-nav">  View Profile  </td>
                        </tr>
                        <tr onclick="redirectToMainPage()">
                            <td class="sub-nav">Reservation</td>
                        </tr>
                    </table>

                    <div class="sub-nav" onclick="redirectToLoginPage()">Sign Out</div>
                    
                </div>
            </div>
        </div>
    </div>


</header>

  </nav>
    `;
    
    document.getElementById('nav-placeholder').innerHTML = navHtml;
  }
  
  function loadModal() {
    const navHtml = `
    <nav>
    <div class="modal" id="modalA">
    <div class="modal-header">
      <div id="title" class="text">Available</div>
      <div id="status" class="text">Available</div>
      <div id="xcontainer"><button data-close-button class="close-button">&times;</button></div>
    </div>
    <div class="contentA">
      <div class="modal-body">
        <div class="date text">Date: 2024-2-12</div>
        <div class="time text">Time: 9:00-9:30</div>
        <div class="user-input-container">
          <input type="checkbox" id="anon">
          <label for="anon" class="text">Reserve Anonymously</label>
        </div>
        <div class="reserve-button-container"><button data-reserve-button id="reserve">Reserve</button></div>
      </div>
    </div>
  
  </div>
  <div class="modal" id="modalB">
    <div class="modal-header">
      <div id="title" class="text">Reserved</div>
      <div id="status" class="text">Reserved</div>
      <div id="xcontainer"></div><button data-close-button class="close-button">&times;</button>
    </div>
    <div class="content">
      <div class="modal-body">
        <div class="date text">Date: 2024-2-12</div>
        <div class="time text">Time: 9:00-9:30</div>
        <div class="reserver-details">
            <div class="name-placeholder text">Reserver Name: </div>
            <div class="reserver-name"><a class="text" href="../Profile/profilePublic.html" >Alex Chang</a></div>
        </div>
        <div><button data-reserve-button id="close">Close</button></div>
      </div>
    </div>
  
  </div>
  
  <div class="modal" id="modalC">
    <div class="modal-header">
      <div id="title" class="text">Reserved</div>
      <div id="status" class="text">Reserved</div>
      <div id="xcontainer"></div><button data-close-button class="close-button">&times;</button>
    </div>
    <div class="content">
      <div class="modal-body">
        <div class="date text">Date: 2024-2-12</div>
        <div class="time text">Time: 9:00-9:30</div>
        <div class="reserver-details">
            <div class="name-placeholder text">Reserver Name: Anonymous</div>
        </div>
        <div><button data-cancel-button id="close">Back</button></div>
      </div>
    </div>
  
  </div>
  
  <div class="modal" id="modalD">
    <div class="modal-header">
      <div id="title" class="text">Reserved</div>
      <div id="status" class="text">Reserved</div>
      <div id="xcontainer"></div><button data-close-button class="close-button">&times;</button>
    </div>
    <div class="content">
      <div class="modal-body">
        <div class="date text">Date: 2024-2-12</div>
        <div class="time text">Time: 9:00-9:30</div>
        <div class="reserver-details">
            <div class="name-placeholder text">Reserver Name: </div>
            <div class="reserver-name"><a href="../Profile/profile.html" class="text">Maya Rodriguez</a></div>
        </div>
        <div><button data-cancel-button id="cancel">Cancel Reservation</button></div>
      </div>
    </div>
  </div>
  
  
  <div class="modal" id="modalE">
    <div class="modal-header">
      <div id="title" class="text">Reserved</div>
      <div id="status" class="text">Reserved</div>
      <div id="xcontainer"></div><button data-close-button class="close-button">&times;</button>
    </div>
    <div class="content">
      <div class="modal-body">
        <div class="date text">Date: 2024-2-12</div>
        <div class="time text">Time: 9:00-9:30</div>
        <div class="reserver-details">
            <div class="name-placeholder text">Reserver Name: Anonymous(YOU)</div>
        </div>
        <div><button data-cancel-button id="cancel2">Cancel Reservation</button></div>
      </div>
    </div>
  </div>
  
  <div id="over"></div>
    
    </nav>
  
   
    `;
    
    document.getElementById('modal-placeholder').innerHTML = navHtml;
  }


  function loadModalTech() {
    const navHtml = `
    <nav>
      <div class="modal" id="modalA">
      <div class="modal-header">
        <div id="title" class="text">Available</div>
        <div id="status" class="text">Available</div>
        <div id="xcontainer"></div><button data-close-button class="close-button">&times;</button>
      </div>
      <div class="contentA">
        <div class="modal-body">
          <div class="date text">Date: 2024-2-12</div>
          <div class="time text">Time: 9:00-9:30</div>
          <div class="user-input-container">
              <label for="reserved-tech" class="text">Reserve For: </label>
              <input type="text" id="reserved-tech">
          </div>
          <div><button data-reserve-button id="reserve" class="text">Reserve</button></div>
        </div>
      </div>

    </div>
    <div class="modal" id="modalB">
      <div class="modal-header">
        <div id="title" class="text">Reserved</div>
        <div id="status" class="text">Reserved</div>
        <div id="xcontainer"></div><button data-close-button class="close-button">&times;</button>
      </div>
      <div class="content">
        <div class="modal-body">
          <div class="date text">Date: 2024-2-12</div>
          <div class="time text">Time: 9:00-9:30</div>
          <div class="reserver-details">
              <div class="name-placeholder text" id="name">Reserver Name: </div>
          </div>
          <div><button data-cancel-button id="close">Cancel Reservation</button></div>
        </div>
      </div>

    </div>
    <div id="overlay"></div>
    </nav>
  
   
    `;
    
    document.getElementById('modal-placeholder').innerHTML = navHtml;
  }

