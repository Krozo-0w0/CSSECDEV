$(document).ready(function(){
  let idA;
  const overlay = document.getElementById('overlay');
  var id;
  var room = $("#roomNum").text();

  

  //reload content of page 
  function loadData(){
    
    var selectedDate = $("#date-input").val();
    var selectedOption = $("#timeSelect").find("option:selected").val();

    $.post('../loadReserve', {date: selectedDate, time:selectedOption}, 
    function(data, status){
      if(status==='success'){

        console.log(data.status);
        if(data.status == 'lol'){
          location.reload();
        }

        for(let i = 0; i < data.reservation.length; i++){
          if(!($('#'+data.reservation[i].seat).hasClass('reserved'))){
            $('#'+data.reservation[i].seat).addClass('reserved');
          }
        }


        
    let logData = ` 
    <thead>               
      <tr>
      <th class="logDateTime">Date and Time</th>
      <th class="logName">Name</th>
      <th class="logActions">Status</th>
      <th class="logSeat">Seat</th>
      <th class="logDate">Date</th>
      <th class="logTime">Time-slot</th>
      <th class="logEmail">Email</th>
  </tr> </thead> <tbody>`;

    for(let i = 0; i < data.resData.length; i++){
      logData +=  `                    
        <tr>
        <td class="logDateTime">`+ data.resData[i].dateTime +`</td>
        <td class="logName">`+ data.resData[i].name +`</td>
        <td class="logActions">`+ data.resData[i].status +`</td>
        <td class="logSeat">`+ data.resData[i].seat +`</td>
        <td class="logDate">`+ data.resData[i].bookDate +`</td>
        <td class="logTime">`+ data.resData[i].timeFrame +`</td>
        <td class="logEmail">`+ data.resData[i].email +`</td>
        </tr>`
    }

    logData += `</tbody>`
    

    var logTable = $("#log-table").html(logData);
      }
    });

    
    $.post('../getTimeFrames', {date: selectedDate},
    function(data, status){
      if(status ==='success'){
        let dateopt = '';
        var selectedTime = $("#timeSelect").find("option:selected").val();

        for(let i = 0; i < data.dateData.length; i++){
          if(selectedTime == data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd){
            dateopt += "<option value="+ data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd + ">" + data.dateData[i].timeStart + " - " + data.dateData[i].timeEnd + " :: Available: " + (data.dateData[i].available) + "</option>";

          }else{
            dateopt += "<option value="+ data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd + ">" + data.dateData[i].timeStart + " - " + data.dateData[i].timeEnd + " :: Available: " + data.dateData[i].available + "</option>";
          }
        }
        $("#timeSelect").html(dateopt);
        $("#timeSelect").val(selectedTime);
      }
    }); 
  }

    setInterval(loadData, 10000);
  

  
  //initiate click actions 
  $.post('/labdetails', {roomNum: $(roomNum).text()}, 
        function(data, status){
          if(status==='success'){
            loadClicks(data.lab.numCols, data.lab.seats);
          }
        }
  );

  $(".close-button").click(function(){
    let overlay = document.getElementById("overlay");
    overlay.classList.remove('active');
    $(idA).hide();
  });

  $(".close").click(function(){
    let overlay = document.getElementById("overlay");
    overlay.classList.remove('active');
    $(idA).hide();
  });

$(".cancel").click(function(){
    //get the needed values
    var selectedOption = $("#timeSelect").find("option:selected").val();
    var selectedDate = $('#date-input').val();
    

    $.post('../removeReservation', {room: room, seat: id, date: selectedDate, timeFrame: selectedOption}, 
    function(data, status){
      if(status==='success'){
        $('#'+id).removeClass('reserved');
        overlay.classList.remove('active');
        $(idA).hide();
      }
    });


    $.post('../getTimeFrames', {date: selectedDate},
    function(data, status){
      if(status ==='success'){
        let dateopt = '';
        var selectedTime = $("#timeSelect").find("option:selected").val();
    
        for(let i = 0; i < data.dateData.length; i++){
          if(selectedTime == data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd){
            dateopt += "<option value="+ data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd + ">" + data.dateData[i].timeStart + " - " + data.dateData[i].timeEnd + " :: Available: " + (data.dateData[i].available) + "</option>";

          }else{
            dateopt += "<option value="+ data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd + ">" + data.dateData[i].timeStart + " - " + data.dateData[i].timeEnd + " :: Available: " + data.dateData[i].available + "</option>";
          }
        }
        $("#timeSelect").html(dateopt);
        $("#timeSelect").val(selectedTime);
      }
    });
  });

  function isDateTimeEarlierThanNow(dateString, timeString) {
    
    var time = timeString.split("-");
    var [hours, minutes] = time[0].split(':').map(Number);
    var [year, month, day] = dateString.split('-').map(Number);
    var dateTimeToCheck = new Date(year, month - 1, day, hours, minutes);
    var currentDate = new Date();
    return dateTimeToCheck < currentDate;
}

  $("#reserve").click(function(){
    //get time and date selected
    var selectedOption = $("#timeSelect").find("option:selected").val();
    let res = document.getElementById("anon").checked;
    var selectedDate = $('#date-input').val();



    //get name and email of the walkin student
    var name = $("#reserved-name").val();
    var email = $("#reserved-email").val();

    if (name.trim() === '' || email.trim() === '') {
      alert('Name and Email fields are required!');
      return;
    }

    if(isDateTimeEarlierThanNow(String(selectedDate), selectedOption)){
      alert("Cannot Reserve, the Reservation time is already Done.");
      return;
    }

    $.post("../checkReserve", {timeFrame: selectedOption, date: selectedDate, seat: id}, 
      function(data, status){
        if(status==='success'){
          if(data.status === 'avail'){

              $.post('../reserve', {room: room, seat: id, anon: res, date: selectedDate, timeFrame: selectedOption, email, name}, 
              function(data, status){
                if(status === 'success'){
                  if(data.status === "reserved"){
                    let block = document.getElementById(id);
            
                    block.classList.add('reserved');
                    $(idA).hide();
                    let overlay = document.getElementById("overlay");
                    overlay.classList.remove('active');

                    //add new log
                    let logData =  `                    
                    <tr>
                    <td class="logDateTime">`+ data.reserve.dateTime +`</td>
                    <td class="logName">`+ data.reserve.name +`</td>
                    <td class="logActions">`+ data.reserve.status +`</td>
                    <td class="logSeat">`+ data.reserve.seat +`</td>
                    <td class="logDate">`+ data.reserve.bookDate +`</td>
                    <td class="logTime">`+ data.reserve.timeFrame +`</td>
                    <td class="logEmail">`+ data.reserve.email +`</td>
                    </tr>`

                    var logTable = $("#log-table").html($("#log-table").html() + logData);

                  }
                }
              });


              

              $.post('../getTimeFrames', {date: selectedDate},
              function(data, status){
                if(status ==='success'){
                  let dateopt = '';
                  var selectedTime = $("#timeSelect").find("option:selected").val();
              
                  for(let i = 0; i < data.dateData.length; i++){
                    if(selectedTime == data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd){
                      dateopt += "<option value="+ data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd + ">" + data.dateData[i].timeStart + " - " + data.dateData[i].timeEnd + " :: Available: " + (data.dateData[i].available - 1) + "</option>";

                    }else{
                      dateopt += "<option value="+ data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd + ">" + data.dateData[i].timeStart + " - " + data.dateData[i].timeEnd + " :: Available: " + data.dateData[i].available + "</option>";
                    }
                  }
                  $("#timeSelect").html(dateopt);
                  $("#timeSelect").val(selectedTime);
                }

              })

          }else{
            alert('Slot is already Taken.');
          }
        }
      }); 
  });


  $("#overlay").click(function(){
    $(idA).hide();
    let overlay = document.getElementById("overlay");
    overlay.classList.remove('active');
  });


  $('#date-input').change(function() {
    updateValues(1);
  });


$("#timeSelect").change(function() {
  updateValues(2);
});

function updateValues(call){
  var selectedDate = $("#date-input").val();
  var selectedOption = $("#timeSelect").find("option:selected").val();


  $.post('../dateChange', {date: selectedDate, timeFrame: selectedOption, changed: call}, function(data, status){
    if(status === 'success'){
      let templateHTML;
      let templateDate;

      let slots = '';
      let dateopt = '';

      
    
      for(let i = 0; i < data.dateData.length; i++){
        dateopt += "<option value="+ data.dateData[i].timeStart + "-" + data.dateData[i].timeEnd + ">" + data.dateData[i].timeStart + " - " + data.dateData[i].timeEnd + " :: Available: " + data.dateData[i].available + "</option>";
      }

      $("#timeSelect").html(dateopt);

      if(call == 2){
        $("#timeSelect").val(selectedOption);
      }



      //insert the data in the timeslot
      for(let i = 1; i <= data.lab.numCols; i++){
        templateHTML = `<div class="column" id="C`+i+`">`;
        for(let j = 1; j <= parseInt(data.lab.seats); j++){

          if( (data.reserved).includes("C"+i+"S"+j)){
            templateHTML +=  `<button class="row reserved" id="C`+i+`S`+j+`">C`+i+`S`+j+`</button>`;
          }else{
            templateHTML += `<button class="row" id="C`+i+`S`+j+`">C`+i+`S`+j+`</button>`;
          }
            
        }

        templateHTML += "</div>";
        slots += templateHTML;


        //load log datas
        let logData = ` 
        <thead>               
          <tr>
          <th class="logDateTime">Date and Time</th>
          <th class="logName">Name</th>
          <th class="logActions">Status</th>
          <th class="logSeat">Seat</th>
          <th class="logDate">Date</th>
          <th class="logTime">Time-slot</th>
          <th class="logEmail">Email</th>
      </tr> </thead> <tbody>`;

        for(let i = 0; i < data.resData.length; i++){
          logData +=  `                    
            <tr>
            <td class="logDateTime">`+ data.resData[i].dateTime +`</td>
            <td class="logName">`+ data.resData[i].name +`</td>
            <td class="logActions">`+ data.resData[i].status +`</td>
            <td class="logSeat">`+ data.resData[i].seat +`</td>
            <td class="logDate">`+ data.resData[i].bookDate +`</td>
            <td class="logTime">`+ data.resData[i].timeFrame +`</td>
            <td class="logEmail">`+ data.resData[i].email +`</td>
            </tr>`
        }

        logData += `</tbody>`
        

        var logTable = $("#log-table").html(logData);
        
      }

      if(data.dateData.length != 0){
        $(".room-container").html(slots);
      }else{
        $(".room-container").html('');
      }
      

      loadClicks(data.lab.numCols, data.lab.seats);
      

    }
  })
}


function loadClicks(cols, seats){
  for(let i = 1; i <= cols; i++){
    for(let j = 1; j <= seats; j++){
      $("#C"+i+"S"+j).click(function(){
        var selectedDate = $('#date-input').val();

        var selectedOption = $("#timeSelect").find("option:selected").val();
        //current room
        room = $("#roomNum").text();
        let modal;
        id = "C"+i+"S"+j;

        $.post('/modalTech', {seat: "C"+i+"S" + j, roomNum: room, date: selectedDate, timeFrame: selectedOption}, function(data, status){
          if(status==="success"){
            let modalType = 'A';
            //modal type
            if(data.modal == 'C' || data.modal == 'B'){
              modalType = 'B';
            }
            if(data.modal == 'E' || data.modal == 'D'){
              modalType = 'C';
            }
            idA = "#modal"+modalType;

            modal = document.querySelector(idA);
                              
            $(idA).show();
            
            let overlay = document.getElementById("overlay");
            overlay.classList.add('active');

            const title = modal.querySelector('.modal-header #title');
            const datePlaceholder = modal.querySelector('.content .date');
            datePlaceholder.textContent = "Date: " + selectedDate; 
            const timePlaceholder = modal.querySelector('.content .time');
            timePlaceholder.textContent = "Time: " + selectedOption; 
            

            if(modalType == 'B'){
                const name = modal.querySelector('.content #reserver-name');
                name.textContent = data.name;
                name.href =  `/public-profile/` + data.user['_id'];
            }

            if(modalType=='C'){
              const name = modal.querySelector('.content #reserver-name');
              if(data.modal == 'E'){
                name.textContent = "Anonymous"
              }else{
                name.textContent = data.name;
              }
              
            }

            if (title) {
              title.textContent = "C"+i+"S" + j; 
            }


          }
        });
      })
    }
  }
}


});