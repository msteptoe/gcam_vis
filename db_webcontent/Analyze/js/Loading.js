var loadingBar = $('<div class="loadingBar"></div>');
    loadingBar.width(0);
    $('body').append(loadingBar);

var showLoadingBar = function() {
    loadingBar.fadeIn(100);
    loadingBar.width(0.1 * window.innerWidth);
    progressLoadingBar(0.05);
};

var progressLoadingBar = function(progress){
	// console.log('progressLoadingBar');
	var width =  loadingBar.width();
	var delay = 0;

	if(progress){
		if(progress > 0.1){
			width += (progress - 0.1) * window.innerWidth;
			delay = 250;
		}
	}
	else if(width < window.innerWidth - 0.01 * window.innerWidth){
		width += 0.01 * window.innerWidth;
	}
	else{
		return;
	}
	

	loadingBar.animate(
        { width: width },
        delay
    );
}

var hideLoadingBar = function(delay) {
    var fadeOut = 100;

    if(delay)
        fadeOut = delay;

    loadingBar.animate(
        { width: window.innerWidth },
        500,
        function() { loadingBar.fadeOut(delay); }
    );
};

function showLoading(showScreen){
	showLoadingBar();
	if(showScreen){
		$('#loadingScreen').show();
		$('#fountainTextG').css({
			left: ($(window).width() - $('#fountainTextG').outerWidth())/2,
			top: ($(window).height() - $('#fountainTextG').outerHeight())/2
		});
	}
}

function hideLoading(){
	hideLoadingBar();
	$('#loadingScreen').hide();
}