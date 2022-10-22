
<script>

// FR: Premiere etape => fonctions unitaires pour chaque POI
// EN: First step => simple functions to be used for each POI

// FR:calcul de la distance entre deux points à partir de leur longitude et de leur latitude
// EN:distance between two points given lonLat
// http://villemin.gerard.online.fr/aGeograp/Distance.htm (2e méthode loi des sinus)
// d = 6371 x arccos (sin(latitudeA)xsin(latitudeB)+cos(latitudeA)cos(latitudeB)cos(longitudeB-longitudeA)
// FR:conversion lat en degre minutes vers decimal via https://www.fcc.gov/media/radio/dms-decimal
// FR:6371 km = rayon moyen de la terre / 6366 au niveau de Montbard selon https://fr.planetcalc.com/7721/
function distance(pointA, pointB){
	const latA=pointA[1];
	const latB=pointB[1];
	const lonA=pointA[0];
	const lonB=pointB[0];
	return (6371*Math.acos(Math.sin(latA*Math.PI/180)*Math.sin(latB*Math.PI/180)+Math.cos(latA*Math.PI/180)*Math.cos(latB*Math.PI/180)*Math.cos((lonB-lonA)*Math.PI/180)));
}

// FR:profil altimetrique entre deux points a partir du site de l'ign
// EN:altitude between two points (using IGN webservice)
function profilAlti(pointA,pointB){
	let latA=pointA[1];
	let lonA=pointA[0];
	let latB=pointB[1];
	let lonB=pointB[0];
	const getprofil="https://wxs.ign.fr/calcul/alti/rest/elevationLine.json?sampling=10&lon="+lonA+"|"+lonB+"&lat="+latA+"|"+latB;
	const xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", getprofil, false ); // false for synchronous request
    xmlHttp.send( null );
	// window.alert(getprofil+" donne en retour :"+xmlHttp.responseText);
	return xmlHttp.responseText;
};
<!-- FR:exemple appel webservice  / EN:webservice example -->
<!-- https://wxs.ign.fr/calcul/alti/rest/elevationLine.json?sampling=10&lon=0.2367|2.1570|4.3907&lat=48.0551|46.6077|43.91&indent=true -->

// FR: angle de vision par rapport au relief
// EN: view angulus considering natural relief
// TODO : ajouter une fonction pour une hauteur du point d'observation (1m70 pour un humain)
function alphaMaxProfil(obspoint,leprofil){
	let alphamax=-90;
	// window.alert("leprofil egal "+leprofil);
	altitudes=JSON.parse(leprofil).elevations;
	// altitudes=profil.elevations;
	// window.alert("altitudes egal "+altitudes[0].lon);
	for(i in altitudes){
	if(i>0){      // le premier point est à distance nulle donc pas d'angle
	    // window.alert("le point de lon lat"+altitudes[i].lon+" / "+altitudes[i].lat+" altitude "+altitudes[i].z);	
		alpha=180/Math.PI*Math.asin(((altitudes[i].z-altitudes[0].z)/1000)/distance(obspoint,[altitudes[i].lon,altitudes[i].lat])); // passer l'altitude en km
		// window.alert("alpha vaut :"+alpha);
		// window.alert("le sinus vaut :"+(altitudes[i].z-altitudes[0].z)/distance(obspoint,[altitudes[i].lon,altitudes[i].lat]));
		// window.alert("la distance vaut :"+distance(obspoint,[altitudes[i].lon,altitudes[i].lat]));
		if(alpha>alphamax){alphamax=alpha;};
		}
	};
	// window.alert("alphamax egal "+alphamax);
	return alphamax;
};

// FR: visibilite d'un POI par rapport à la ligne d'horizon
// EN: angulus from the horizon line
function pctAboveHorizon(obspoint,poi,height_poi){
	// leprofil=1; // mettre la fonction
	alphamax=alphaMaxProfil(obspoint,profilAlti(obspoint,poi.geometry.coordinates));
	// FR:tan(alphamax)*distance(obspoint,poi) est la hauteur cachée par le relief
	pct_hidden=Math.max(Math.tan(alphamax)*distance(obspoint,poi.geometry.coordinates),0)/(1000*height_poi); // la hauteur du POI est en m, la distance en km
	return Math.min(1-pct_hidden,1); // FR: entre 0 et 1
};

// FR: Deuxieme etape => travail autour du point d'observation
// EN: Second step => working around the observation point

function coordcercle(uncentre,unrayon,unangle){    // uncentre avec lon,lat puis unrayon en km, un angle en degres
// la fonction se base sur l'approximation que le cercle en surface est orthogonal au rayon de la terre en corrigeant la longitude (le cercle est moins grand)
// la variation d'angle \alpha (par rapport au Nord, dans le sens des aiguilles) sur le cercle aboutit aux variations de coordonnees lonLat ci-dessous 
	const lalon=(180/Math.PI)*(unrayon*Math.sin(unangle*Math.PI/180)/(6371*Math.cos(uncentre[1]*Math.PI/180)));	
	const lalat=(180/Math.PI)*(Math.atan(Math.sinh(unrayon*Math.cos(unangle*Math.PI/180)/6371))); 
	const leretour=[uncentre[0]+lalon,uncentre[1]+lalat];
//	const verifdist=distance(uncentre,leretour);
	return leretour; 
};

function angleAzimut(pointA, pointB){ // calcul de l azimut a partir du Nord
	let angleout=0; // on part sur le point au nord
	const latA=pointA[1];
	const latB=pointB[1];
	const lonA=pointA[0];
	const lonB=pointB[0];
	let meridien=6371*Math.acos(Math.sin(latA*Math.PI/180)*Math.sin(latB*Math.PI/180)+Math.cos(latA*Math.PI/180)*Math.cos(latB*Math.PI/180));
	// FR: en suivant le parallèle (même latitude), on a le cosinus de l'angle puis on conclut sur le bon quadrant
	// EN: following parallel (same latitude), you get cosinus for the angulus then you derive real quadrant
	// let parallele=6371*Math.acos(Math.sin(latA*Math.PI/180)*Math.sin(latA*Math.PI/180)+Math.cos(latA*Math.PI/180)*Math.cos(latA*Math.PI/180)*Math.cos((lonB-lonA)*Math.PI/180));
	// on determine l'angle avec le sinus et cosinus
	let anglemajeur=180*Math.acos(meridien/distance(pointA, pointB))/Math.PI; // Arccos répond dans O,PI et on recale dans 0,180
	// window.alert("on est dans la fonction8");
	if(lonB==lonA){
				if (latB>=latA) {angleout=0} else {angleout=180}
				 }
		else if (latB>latA) {angleout=anglemajeur} // sur 0,PI, B est au-dessus de A 
		else {angleout=180-anglemajeur};
		// window.alert("on a un angle majeur de "+anglemajeur);
	return angleout;
};

// FR: caracterisation des POI par rapport au point d'observation
// EN: characteristics of the POI depending on observation point
function POIAroundObs(unobspoint,despoi,unrayonmin=0,unrayonmax=10){
	despoi.features.forEach(function(unpoi){
		const lepct=pctAboveHorizon(unobspoint,unpoi,unpoi.properties.poiheight);
		const langle=Math.floor(angleAzimut(unobspoint,unpoi.geometry.coordinates));
		const ladist=distance(unobspoint,unpoi.geometry.coordinates);
		//	window.alert("on voit "+lepct+" avec un angle de "+langle+" a une distance de "+ladist);
		if(ladist>unrayonmin & ladist<unrayonmax){
			unpoi.properties.angle=langle;
			unpoi.properties.pctvisible=lepct;
						}});
	// window.alert(JSON.stringify(despoi));
	return despoi;
};
// FR: remplissage du cercle autour du point d'observation
// avec le nombre de poi visible sur chaque degre
// EN: filling the circle around the observation point
// with the number of visible poi related to each degree
function computeStatCircle(unobspoint,despoi,unrayon){
const lecercle={'type': 'FeatureCollection','features':[]}; // debut du geojson du cercle
// window.alert("0despoivaut "+JSON.stringify(despoi));
let letableau=POIAroundObs(unobspoint,despoi); // en fait, despoi est aussi mis à jour
// window.alert("1despoivaut "+JSON.stringify(despoi));
// pour filter, voir https://www.freecodecamp.org/news/javascript-array-filter-tutorial-how-to-iterate-through-elements-in-an-array/
// autre possibilite : let test = wtf.features.filter(([key, value]) => key.endsWith('A'))
let test = letableau.features.filter(item => item.properties.angle == 64 & item.properties.pctvisible > 0.1);
window.alert("7"+test.length);
	<!-- let tableau=Array(360).fill(0); // initialisation du tableau -->
	<!-- despoi.forEach(function(unpoi){ -->
	<!-- // window.alert(unpoi.angle);  // YESSSS IT WORKS -->
	<!-- const langle=Math.floor(angle(unobspoint,unpoi.geometry.coordinates)); -->
	<!-- const ladist=distance(unobspoint,unpoi.geometry.coordinates); -->
	<!-- // window.alert("on va dans la case "+langle+" sur le point "+unpoi.geometry.coordinates); -->
	<!-- if(ladist>unrayonmin & ladist<unrayonmax){tableau[langle]+=1;}; -->
	<!-- // window.alert("la valeur du tableau "+tableau[langle]); -->
					<!-- }); -->
	<!-- return tableau; -->
	for (let i = 0; i < 360; i++) {
// on cree la surface à colorier
<!-- // if (i % 90 == 0){window.alert("C'est la boucle "+i);}; // un message tous les 90 -->
		
		lecercle.features[i]=JSON.parse('{"type": "Feature",'+
										' "properties": {"poivisible": "'+
										letableau.features.filter(item => item.properties.angle == i & item.properties.pctvisible > 0.1).length
										+'", "azimut" : "' + i
										+'" },'+
										' "geometry": {"type": "Polygon", "coordinates": [[['+
							coordcercle(unobspoint,unrayon-0.1,i)+'],['+coordcercle(unobspoint,unrayon+0.1,i)+'],['+coordcercle(unobspoint,unrayon+0.1,i+1)+'],['+coordcercle(unobspoint,unrayon-0.1,i+1)+
							']]]}}');
	};
	window.alert("C'est la cercle "+JSON.stringify(lecercle));
	return lecercle;
};	

// dessin des emprises visuelles à partir du point de vue
// draw the poi groups from observation point
function poiGroupings(unobspoint,despoi,unrayon){
	let lesgroupes=[];
	let lesmins=[];
	let lesmaxs=[];
	despoi.features.forEach(function(unpoi){
	let laprop=unpoi.properties.poigroup;
	// window.alert("1.boucle sur :"+laprop+"angle"+angleAzimut(unobspoint,unpoi.geometry.coordinates));
		if(lesgroupes.filter(item => item == laprop ).length==0){
			lesgroupes.push(laprop);
			lesmins[lesgroupes.indexOf(laprop)]=angleAzimut(unobspoint,unpoi.geometry.coordinates);
			lesmaxs[lesgroupes.indexOf(laprop)]=angleAzimut(unobspoint,unpoi.geometry.coordinates);
			}
			else{
			if(angleAzimut(unobspoint,unpoi.geometry.coordinates)<lesmins[lesgroupes.indexOf(laprop)]){lesmins[lesgroupes.indexOf(laprop)]=angleAzimut(unobspoint,unpoi.geometry.coordinates)};
			if(angleAzimut(unobspoint,unpoi.geometry.coordinates)>lesmaxs[lesgroupes.indexOf(laprop)]){lesmaxs[lesgroupes.indexOf(laprop)]=angleAzimut(unobspoint,unpoi.geometry.coordinates)};			
			}
	});
	// let toto = Object.values(despoi.features).properties.poigroup;
	window.alert("2.boucle sur :"+lesgroupes);
	<!-- window.alert("2.Parc 2 min/max :"+lesmins[lesgroupes.indexOf("Parc 2")]+"/"+lesmaxs[lesgroupes.indexOf("Parc 2")]); -->
	<!-- function onlyUnique(value, index, self) {  -->
		<!-- return self.indexOf(value) === index; -->
	<!-- }; -->
	// window.alert("boucle sur :"+despoi.features);
	<!-- lesgroupes=despoi.features.filter( (value, index, self) => self.properties.poigroup.indexOf(value) === properties.poigroup.index ); -->

<!-- // usage example: -->
<!-- var a = ['a', 1, 'a', 2, '1']; -->
<!-- var unique = a.filter( onlyUnique ); -->
	<!-- window.alert("lesgroupes: "+lesgroupes); -->
const larcdecercle={'type': 'FeatureCollection','features':[]}; // debut du geojson du secteur
	lesgroupes.forEach(function(ungroupe){
		lesgroupes.indexOf(ungroupe);
		// window.alert("Le groupe :"+ungroupe+" a un index "+lesgroupes.indexOf(ungroupe)+"avec un min/max :"+
		// lesmins[lesgroupes.indexOf(ungroupe)]+"/"+lesmaxs[lesgroupes.indexOf(ungroupe)]
		// );
		<!-- larcdecercle.features[lesgroupes.indexOf(ungroupe)]=JSON.parse('{"type": "Feature",'+ -->
										<!-- ' "properties": {"poigroup": "'+ ungroupe +'"},'+ -->
										<!-- ' "geometry": {"type": "Polygon", "coordinates": [[['+ -->
							<!-- unobspoint+'],['+coordcercle(unobspoint,unrayon-0.1,lesmaxs[lesgroupes.indexOf(ungroupe)])+ -->
							<!-- '],['+coordcercle(unobspoint,unrayon-0.1,lesmins[lesgroupes.indexOf(ungroupe)])+ -->
							<!-- ']]]}}');	 -->
		let lechemindarc= "";
		for(let k=Math.floor(lesmins[lesgroupes.indexOf(ungroupe)]);k<lesmaxs[lesgroupes.indexOf(ungroupe)]+1;k++){
			lechemindarc=lechemindarc+'],['+coordcercle(unobspoint,unrayon-0.1,k);
			};
		// window.alert("lechemindarc"+lechemindarc);	
		larcdecercle.features[lesgroupes.indexOf(ungroupe)]=JSON.parse('{"type": "Feature",'+ 
							' "properties": {"poigroup": "'+ungroupe+'"},'+
							'"geometry": {"type": "Polygon", "coordinates": [[['+
							unobspoint	+ lechemindarc +
							']]]}'+ // fermeture de la geometry
							'}' // fermeture du geojson 
							);
	}
	);
	// window.alert(JSON.stringify(larcdecercle.features[0]));
	return larcdecercle;
};



function drawMap(obs_point,a_geojson,a_circle,some_sectors){	
	var map = new maplibregl.Map({
	container: 'map', // container id
	// style: 'https://demotiles.maplibre.org/style.json', // style URL
	style: 'https://geoserveis.icgc.cat/contextmaps/osm-bright.json',
	center: obs_point, // starting position [lng, lat]
	zoom: 10// starting zoom = 1 mais on prend 10
	});
	var here_marker = new maplibregl.Marker()
	.setLngLat(obs_point)
	.addTo(map);
	window.alert(JSON.stringify(a_circle));
map.on('load', function () {
		map.addSource('lecercle', {
				'type': 'geojson',
				'data': a_circle
			});
		map.addSource('touslespoi', {
				'type': 'geojson',
				'data': a_geojson
			});	
		map.setPaintProperty('building', 'fill-color', [
			['zoom'],
			15,
			'#e2714b',
			22,
			'#eee695'
			]);
		map.addSource('lesarcs', {
				'type': 'geojson',
				'data': some_sectors
			});	
		map.addLayer({
				'id': 'touslespoi',
				'type': 'circle',
				'source': 'touslespoi',
				'paint': {
            "circle-color": "hsla(0,0%,0%,0.75)",
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "red",
				}
			});			
		map.addLayer({
				'id': 'lesarcs',
				'type': 'fill',
				'source': 'lesarcs',
				'layout': {},
				'paint': {
 					'fill-color': '#088',  // le code à 3 caractères #abc est en fait un raccourci du code hexa "doublé" #aabbcc
					'fill-opacity': 0.8
					}
			});							
		map.addLayer({
				'id': 'leslibres',
				'type': 'fill',
				'source': 'lecercle',
				'layout': {},
				'paint': {
					'fill-color': '#088',  // le code à 3 caractères #abc est en fait un raccourci du code hexa "doublé" #aabbcc
					'fill-opacity': 0.8
				},
				'filter': ['==', 'poivisible', '0']
			});
				<!-- 'filter': ['==', '["get", "nbpoi"]', '0'] -->
			
		map.addLayer({
				'id': 'lesoccupes',
				'type': 'fill',
				'source': 'lecercle',
				'layout': {},
				'paint': {
					'fill-color': '#c03',  // le code à 3 caractères # abc est en fait un raccourci du code hexa "doublé" #aabbcc 
					'fill-opacity': 0.8
				},
				'filter': ['>=', 'poivisible', '1']
			});

	});
};

// FIN DES FONCTIONS

const obs_point = [4.2261, 47.6683]; // FR:le point d'observation - EN:observation point
// FR:ensemble des donnees des POI au format geojson avec coordonnees longitude puis latitude
// EN:POI data in geojson format with coordinates in lonLat format
// TODO: lecture d'un fichier geojson ou csv fourni par le client

const data = require('./eolienne_bfc.json');
console.log(data);

fetch("./eolienne_bfc.json")
// step 1
.then(response => {
   return response.json();
})
// step 2
/*.then(data => data.features.forEach(function(unpoi){
	if (unpoi.properties["LEG_MAT"] == "construite","accordée"){window.alert("une eolienne lue");};
	}))*/
// step 3
.then(data => window.alert("enbfc "+data));
//.then(data => const poi_vector = data);
window.alert("lepremierpoiest"+poi_vector[0]);
// poigroup

/* const poi_vector = {
'type': 'FeatureCollection',
'features': [
{
'type': 'Feature',
'properties': {
'poigroup': 'Parc 3',
'poiheight': 120 
},
'geometry': {
'type': 'Point',
'coordinates': [4.2661, 47.6683]
}
},
{
'type': 'Feature',
'properties': {
'poigroup': 'Parc 1',
'poiheight': 120 
},
'geometry': {
'type': 'Point',
'coordinates': [4.2661, 47.62361183]
}
},
{
'type': 'Feature',
'properties': {
'poigroup': 'Parc 1',
'poiheight': 150 
},
'geometry': {
'type': 'Point',
'coordinates': [4.337778, 47.623611]
}
},
{
'type': 'Feature',
'properties': {
'poigroup': 'Parc 2',
'poiheight': 150 
},
'geometry': {
'type': 'Point',
'coordinates': [4.3, 47.7]
}
},
{
'type': 'Feature',
'properties': {
'poigroup': 'Parc 2',
'poiheight': 150 
},
'geometry': {
'type': 'Point',
'coordinates': [4.337778, 47.703611]
}
}
]
};
 */
 // fin du fichier geojson - end of geojson file

// window.alert(JSON.stringify(POIAroundObs(obs_point,poi_vector,unrayonmin=0,unrayonmax=10)));
// computeStatCircle(obs_point,poi_vector);
// poiGroupings(obs_point,poi_vector,5);
drawMap(obs_point,poi_vector,computeStatCircle(obs_point,poi_vector,5),poiGroupings(obs_point,poi_vector,5))

</script>