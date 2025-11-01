$(document).ready(function(){
    $("#date").change(function() {
        const date =  $("#date").val();

        $.post('changeModifyLab', {date: date},
        function(data, status){
            if(status === 'success'){
                let options = '';
                for(let i = 0; i < data.dateData.length; i++){
                    options += '<option value="'+ data.dateData[i].timeStart + `-`+ data.dateData[i].timeEnd + `">` + data.dateData[i].timeStart + `-` + data.dateData[i].timeEnd + `</option>`;
                }
                $("#timeSelect").html(options);
            }
        });
    });

    //action when click add
    $('#add').click(function(){
        //get all the data
        const date =  $("#date").val();
        const timeStart =  $("#start-time").val();

        var timeParts = timeStart.split(":");

        const timeFrame = add30Minutes(String(timeStart));

        console.log(timeFrame);

 
        $.post('addTimeFrame', {date, timeStart, timeEnd:timeFrame},
        function(data, status){
            if(status === 'success'){
                location.reload();
                if(data.stat === 'success'){
                    alert("Schedule Added!!");
                }else{
                    alert("Conflict With other Time Slots!!");
                }

            }
        });
    });

    $('#delete').click(function(){
        const date =  $("#date").val();
        const timeSelect =  $("#timeSelect").val();

        var frameParts = timeSelect.split("-");
 
        $.post('deleteTimeFrame', {date, timeStart:frameParts[0], timeEnd:frameParts[1]},
        function(data, status){
            if(status ==='success'){
                location.reload();
                if(data.stat === 'success'){
                    alert("successfully deleted TimeFrame");
                }
            }
        });

    })

    

    function add30Minutes(timeString) {
        // Split the time string by ":"
        var timeParts = timeString.split(":");
    
        // Parse hours and minutes
        var hours = parseInt(timeParts[0]);
        var minutes = parseInt(timeParts[1]);
    
        // Add 30 minutes
        minutes += 30;
    
        // Check if minutes exceed 60
        if (minutes >= 60) {
            // Adjust hours and minutes
            hours += Math.floor(minutes / 60);
            minutes %= 60;
        }
    
        // Check if hours exceed 24 (Military time)
        hours %= 24;
    
        // Format the adjusted time
        var adjustedTime = (hours < 10 ? '0' : '') + hours + ":" + (minutes < 10 ? '0' : '') + minutes;
    
        return adjustedTime;
    }


});