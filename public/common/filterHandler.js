$(document).ready(function(){
    $(".searchFilterContainer").click(function(){
        $(".searchFilterContainer").removeClass("selected");
        $(this).addClass("selected");
    });

    $("#people").click(function(){
        // Replace content of .flexParent with the new structure for peopleContainer

        $.post(
            
            /* Link sent to the server */
            'load-people',
            /* Input sent to the server */
            { input: 1 },
            /* Call-back function that processes the server response */
            function(data, status){
              if(status === 'success'){
                $('#stringInput').attr('placeholder', "Searching for: " + data.searchQuery);
                $(".laboratoryContainer").hide();
                $('.flexParent').empty();

                for (let i = 0 ; i < data.users.length; i++){
                    var textContent = $(`
                    <div class="profileContainer" onclick="window.location.href = '/public-profile/` + data.users[i]['_id'] +`'">
           
                           <div class="heading">
                               <div class="profilePicture">
                                   <img src="` + data.users[i]['pfp'] +`">
                               </div>
                               <h1> ` + data.users[i]['username'] +` </h1>
                           </div>
                           <div class="profileDetails">
                               <h2> ` + data.users[i]['bio'] +` </h2>
                           </div>
                       </div>`);
                    $('.flexParent').append(textContent);
                }
              }//if
            });//fn+post
    });

    $("#room").click(function(){
       $.post( 'load-labs', { input: 1 } , 
       function(data, status){
        if(status === 'success'){
          $('#stringInput').attr('placeholder', "Searching for: " + data.searchQuery);
          $(".profileContainer").hide();
          $('.flexParent').empty();

          for (let i = 0 ; i < data.labs.length; i++){
              var textContent = $(`
              <div class="laboratoryContainer" onclick="window.location.href = '/labs/` + data.labs[i]['_id'] +`'">
                <div class="heading">
                    <h1> Laboratory: `+ data.labs[i]['roomNum']+`</h1>
                </div>

            
                <div class="laboratoryDetailsContainer">
                    <div class="laboratoryDetails">

                        <h2> Total Seats: ` + data.labs[i]['totalSeats'] + `</h2>
                        <h2> Building: ` + data.labs[i]['building'] + `</h2>
                        <h2> Floor: ` + data.labs[i]['floor'] + `</h2>
                    </div>
                    <div class="laboratoryDetails">
                        <h2> Time Start: `+ data.labs[i]['timeStart']+ `</h2>
                        <h2> Time End: `+ data.labs[i]['timeEnd']+ `</h2>
                        <h2> Tags: `+ data.labs[i]['tags']+ `</h2>
                    </div>
                </div>`);
              $('.flexParent').append(textContent);
          }
        }//if
      });//fn+post
    });

    $("#tags").click(function(){
        $.post( 'load-labsbytags', { input: 2 } , 
        function(data, status){
         if(status === 'success'){
           $('#stringInput').attr('placeholder', "Searching for: " + data.searchQuery);
           $(".profileContainer").hide();
           $('.flexParent').empty();
 
           for (let i = 0 ; i < data.labs.length; i++){
               var textContent = $(`
               <div class="laboratoryContainer" onclick="window.location.href = '/labs/` + data.labs[i]['_id'] +`'">
                 <div class="heading">
                     <h1> Laboratory: `+ data.labs[i]['roomNum']+`</h1>
                 </div>
 
             
                 <div class="laboratoryDetailsContainer">
                     <div class="laboratoryDetails">
 
                         <h2> Total Seats: ` + data.labs[i]['totalSeats'] + `</h2>
                         <h2> Building: ` + data.labs[i]['building'] + `</h2>
                         <h2> Floor: ` + data.labs[i]['floor'] + `</h2>
                     </div>
                     <div class="laboratoryDetails">
                         <h2> Time Start: `+ data.labs[i]['timeStart']+ `</h2>
                         <h2> Time End: `+ data.labs[i]['timeEnd']+ `</h2>
                         <h2> Tags: `+ data.labs[i]['tags']+ `</h2>
                     </div>
                 </div>`);
               $('.flexParent').append(textContent);
           }
         }//if
       });//fn+post
    });

    $("#etc").click(function(){
        alert('To be implemented phase 3');
    });


});

