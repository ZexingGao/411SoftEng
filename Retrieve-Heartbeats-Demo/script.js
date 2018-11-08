
// get the url
const url = window.location.href;

//getting the access token from url
const access_token = url.split("#")[1].split("=")[1].split("&")[0];

// get the userid
const userId = url.split("#")[1].split("=")[2].split("&")[0];

console.log(access_token);
console.log(userId);
let xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.fitbit.com/1/user/'+ userId +'/activities/heart/date/today/7d.json');
xhr.setRequestHeader("Authorization", 'Bearer ' + access_token);
xhr.onload = function() {
    if (xhr.status === 200) {
        document.write(xhr.responseText);
    }
};
xhr.send();