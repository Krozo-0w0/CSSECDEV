const overlay = document.getElementById('overlay');
let idA;

function handleButtonClick(event) {
  const button = event.target.closest('button[data-modal-target]');
  if (!button) return;

  const avail = button.classList.contains('reserved')

  const modalId = button.getAttribute('data-modal-target');
  const modal = document.querySelector(modalId);

  const id = button.getAttribute('id');
  idA = button.getAttribute('id');

  if(!avail){
    addAttReserve(id);
    const modalId = button.getAttribute('data-modal-target');
    const modal = document.querySelector(modalId);
    const title = modal.querySelector('.modal-header #title');
    if (title) {
      title.textContent = id; 
    }
    openModal(modal);


  } else {
    let modalId;
    if (button.classList.contains('yours') && button.classList.contains('anon')){
      modalId = "#modalE";   
      removeReserve2(id);
    }else if(button.classList.contains('anon')){
      modalId = "#modalC";
    }else if(!button.classList.contains('yours')){
      modalId = "#modalB";
      
    } else{
      removeReserve(id);
      modalId = "#modalD";
    }

    
    
    const modal = document.querySelector(modalId);
    const title = modal.querySelector('.modal-header #title');
    if (title) {
      title.textContent = id; 
    }
    openModal(modal);
  }
  document.getElementById("anon").checked;
  

}
function removeReserve(id){
  let button = document.getElementById("cancel");
  button.setAttribute("onclick", 'changeAvailability("' + id + '")');
}

function removeReserve2(id){
  let button = document.getElementById("cancel2");
  button.setAttribute("onclick", 'changeAvailability("' + id + '")');
}



function addAttReserve(id){
  let button = document.getElementById("reserve");
  button.setAttribute("onclick", 'changeAvailability("' + id + '")');
}

document.addEventListener('click', event => {
  const closeButton = event.target.closest('[data-cancel-button]');
  if (closeButton) {
    const modal = closeButton.closest('.modal');
    closeModal(modal);
    console.log(idA);
  }
});

document.addEventListener('click', handleButtonClick);

overlay.addEventListener('click', () => {
  const modals = document.querySelectorAll('.modal.active');
  modals.forEach(modal => {
    closeModal(modal);
  });
});

document.addEventListener('click', event => {
  const closeButton = event.target.closest('[data-reserve-button]');
  if (closeButton) {
    const modal = closeButton.closest('.modal');
    closeModal(modal);
    process();
  }
});


document.addEventListener('click', event => {
  const closeButton = event.target.closest('[data-close-button]');
  if (closeButton) {
    const modal = closeButton.closest('.modal');
    closeModal(modal);

  }
});

function openModal(modal) {
  if (modal == null) return;
  modal.classList.add('active');
  overlay.classList.add('active');
}

function closeModal(modal) {
  if (modal == null) return;
  modal.classList.remove('active');
  overlay.classList.remove('active');
}


function changeAvailability(id){
  let block = document.getElementById(id);
  
  if (block.classList.contains('reserved')) {
      // If red, change to original color
      block.classList.remove('reserved');
      block.classList.remove('yours');
      block.classList.remove('anon');
      block.style.backgroundColor = "";
      
  } else {
      // If not red, change to red
      block.classList.add('reserved');
      block.classList.add('yours');
      block.style.backgroundColor = "rgba(230, 38, 38, 0.865)";
  }
}

function limitDate(){
  // Get the input element
  var dateInput = document.getElementById('date-input');

  // Calculate the minimum and maximum dates
  var minDate = new Date();
  var maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 6);

  // Format the dates in YYYY-MM-DD format
  var minDateString = minDate.toISOString().slice(0,10);
  var maxDateString = maxDate.toISOString().slice(0,10);

  // Set the min and max attributes of the input
  dateInput.setAttribute('min', minDateString);
  dateInput.setAttribute('max', maxDateString);

}



// Function to generate time options
function generateTimeOptions() {
  // Get the select element
  var timeSelect = document.getElementById('timeSelect');
  var startHour = 9; // Start hour (9:00 am)
  var endHour = 17;  // End hour (5:00 pm)
  
  for (var hour = startHour; hour < endHour; hour++) {
      for (var minute = 0; minute < 60; minute += 30) {
          // Format the time
          var hourString = ('0' + hour).slice(-2);
          var minuteString = ('0' + minute).slice(-2);
          var time = hourString + ':' + minuteString;

          // Create an option element
          var option = document.createElement('option');
          option.value = time;
          option.textContent = time + ' - ' + (hour + Math.floor(minute / 30)) + ':' + ('0' + ((minute + 30) % 60)).slice(-2) + '; Available: 20';
          
          // Add the option to the select element
          timeSelect.appendChild(option);
      }
  }
}

function process(){
  let res = document.getElementById("anon").checked;
  
  if(res){
    document.getElementById(idA).classList.add("anon");
  }
}


function goback(){
  window.location.href="../Mainpage/mainMenu.html";
}
