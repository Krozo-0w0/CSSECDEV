$(document).ready(function(){
  $("#nextBtn").click(function(){
    $.post(
      /* Link sent to the server */
      'nextBtn',
      /* Input sent to the server */
      { input: 1 },
      /* Call-back function that processes the server response */
      function(data, status){
        if(status === 'success'){
          $('#labContainer').empty();
          for (let i = 0 ; i < data.labs.length; i++){
              var textContent = $(`
              <div class="laboratoryContainer" onclick="window.location.href = '/labs/` + data.labs[i]['_id'] + `'">
              <div class="heading">
                  <h1> Laboratory: ` + data.labs[i]['roomNum'] + ` </h1>
              </div>
  
              <div class="laboratoryDetailsContainer">
                  <div class="laboratoryDetails">
                      <h2> Total Seats: ` + data.labs[i]['totalSeats'] + `</h2>
                      <h2> Building: ` + data.labs[i]['building'] + `</h2>
                      <h2> Floor: ` + data.labs[i]['floor'] + `</h2>
                  </div>
                  <div class="laboratoryDetails">
                      <h2> Time Start: ` + data.labs[i]['timeStart'] + `</h2>
                      <h2> Time End: ` + data.labs[i]['timeEnd'] + `</h2>
                      <h2> Tags: ` + data.labs[i]['tags'] + `</h2>
                  </div>
              </div>
              </div>`);
              $('#labContainer').append(textContent);
          }
          
        }//if
      });//fn+post
  });//btn
});//doc


$(document).ready(function(){
  $("#backBtn").click(function(){
    $.post(
      /* Link sent to the server */
      'backBtn',
      /* Input sent to the server */
      { input: 0 },
      /* Call-back function that processes the server response */
      function(data, status){
        if(status === 'success'){
          $('#labContainer').empty();
          console.log(data);
          for (let i = 0 ; i < data.labs.length; i++){
              var textContent = $(`
              <div class="laboratoryContainer" onclick="window.location.href = '/labs/` + data.labs[i]['_id'] + `'">
              <div class="heading">
                  <h1> Laboratory: ` + data.labs[i]['roomNum'] + ` </h1>
              </div>
  
              <div class="laboratoryDetailsContainer">
                  <div class="laboratoryDetails">
                      <h2> Total Seats: ` + data.labs[i]['totalSeats'] + `</h2>
                      <h2> Building: ` + data.labs[i]['building'] + `</h2>
                      <h2> Floor: ` + data.labs[i]['floor'] + `</h2>
                  </div>
                  <div class="laboratoryDetails">
                      <h2> Time Start: ` + data.labs[i]['timeStart'] + `</h2>
                      <h2> Time End: ` + data.labs[i]['timeEnd'] + `</h2>
                      <h2> Tags: ` + data.labs[i]['tags'] + `</h2>
                  </div>
              </div>
              </div>`);

              $('#labContainer').append(textContent);
          }
          
        }//if
      });//fn+post
  });//btn
});//doc