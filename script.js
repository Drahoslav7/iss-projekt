/**
 * projekt do předmětu ISS
 * Drahoslav Bednář, xbedna55
 * 2014/15
 */

var Img = require('./img.js');


/* == řešení == */

// original
// var img0 = Img.load("../xlogin00.bmp"); 
var img0 = Img.load("../xbedna55.bmp"); 


// 1.) Zostření
var filterS = [	[-0.5, -0.5, -0.5],
		 		[-0.5,  5.0, -0.5],
		 		[-0.5, -0.5, -0.5]];

var img1 = img0.filter(filterS);
img1.save("../step1.bmp");


// 2.) Otočení obrazu
var img2 = img1.flipH();
img2.save("../step2.bmp");


// 3.) Mediánový filtr
var img3 = img2.medFilter(5, 5);
img3.save("../step3.bmp");


// 4.) Rozmazání obrazu
var filterB = [	[1, 1, 1, 1, 1],
				[1, 3, 3, 3, 1],
				[1, 3, 9, 3, 1],
				[1, 3, 3, 3, 1],
				[1, 1, 1, 1, 1]];
mapD(filterB, function(x){return x/49});

var img4 = img3.filter(filterB);
img4.save("../step4.bmp");


// 5. Chyba v obraze
var noise = 0.0;
for (var m = 0; m < img0.height; m++) 
	for (var n = 0; n < img0.width; n++)
		noise += Math.abs(img0.map[m][n] - img4.map[m][img4.width-n-1]);

noise /= (img0.height * img0.width);
console.log('chyba=%d', noise);


// 6.) Roztažení histogramu
var lowest = minD(img4.map);
var highest = maxD(img4.map);

var img5 = img4.adjust(lowest, highest, 0, 255);
img5.save("../step5.bmp");


// 7.) Spočítání střední hodnoty a směrodatné odchylky
console.log('mean_no_hist=%d', meanD(img4.map));
console.log('std_no_hist=%d', std2(img4.map));
console.log('mean_hist=%d', meanD(img5.map));
console.log('std_hist=%d', std2(img5.map));


// 8.) Kvantizace obrazu
var img6 = img5.quantization(2,0,255);
img6.save("../step6.bmp");


/*  konec řešení  */



/** == pomocné funkce == **/


/** vrací směrodatnou odchylku (standard deviation) dvourozměrného pole */
function std2 (arr) {
	var mean = meanD(arr);
	var sum = 0, count = 0;
	for (var i = 0; i < arr.length; i++)
		for (var j = 0; j < arr[i].length; j++, count++)
			sum += (arr[i][j] - mean) * (arr[i][j] - mean); 
	return Math.sqrt(sum/count);
}

/** vrací průměr (střední hodnotu) libovolně rozměrného pole */
function meanD (arr) {
	if(!Array.isArray(arr))
		return arr;
	var sum = 0;
	for (var i = 0; i < arr.length; i++)
		sum += meanD(arr[i]);
	return sum/arr.length;
}

/** provede volání funkce nad každým prvkem libovolně rozměrného pole */
function mapD (arr, fce) {
	if(!Array.isArray(arr))
		return fce(arr);
	for (var i = 0; i < arr.length; i++)
		arr[i] = mapD(arr[i], fce);
	return arr;
}

/** vrací nejmenší hodnotu z libovolně rozměrného pole */
function minD (arr) {
	if(!Array.isArray(arr))
		return arr;
	var min, val;
	for (var i = 0; i < arr.length; i++) {
		val = minD(arr[i]);
		if(!(min < val))
			min = val; 
	};
	return min;
}

/** vrací největší hodnotu z libovolně rozměrného pole */
function maxD (arr) {
	if(!Array.isArray(arr))
		return arr;
	var max, val;
	for (var i = 0; i < arr.length; i++) {
		val = maxD(arr[i]);
		if(!(max > val))
			max = val; 
	};
	return max;
}