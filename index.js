const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const request = require('request');
const getYouTubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');
var Queue = require('queue-fifo');

var queue = new Queue();
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;


const YT_API_KEY='';
const BOT_TOKEN='';
const PREFIX = '!';


client.on('ready', () => {
  console.log('I am ready!');
  client.user.setActivity('type !help for commands');
});

client.on('message', message => {
  console.log(queue.size());
  const args=message.content.split(' ');

  //starts with !play and has 1 argument
  if((args[0] === PREFIX + 'play') && args.length > 1){
    var songName = args.slice(1).toString().replace(/,/g , " ");
    if(queue.size() > 0 || isPlaying){
      getID(songName, id =>{
        add_to_queue(id);
        fetchVideoInfo(id, (err, videoInfo) => {
          if (err) throw new Error(err);
          message.reply('Added to queue: **' + videoInfo.title +'**');
        });
      });
    }
    else{
      if(message.member.voiceChannel){
      isPlaying=true;
      getID(songName, id=>{
        queue.enqueue('placeholder');
        fetchVideoInfo(id, (err, videoInfo) => {
          if (err) throw new Error(err);
          client.user.setActivity(videoInfo.title);
          message.reply('Now playing: **' + videoInfo.title +'**');
        });
        playMusic(id, message);
      });
      }
      else{
        message.reply("Sorry! You must be in a voice channel to start playing songs.");
      }
    }
  }
  else if(args[0]===PREFIX+'skip' && args.length===1){
    if(voiceChannel){
      if(queue.isEmpty()){
        message.reply("Nothing to skip.");
      }
      else{
        dispatcher.end();
      }
    }
    else{
      message.reply("I'm not in a voice channel!")
    }

  }
  else if(args[0]===PREFIX+'skipall' && args.length===1){
    if(voiceChannel){
      if(queue.isEmpty()){
        message.reply("Nothing to skip.")
      }
      else{
        dispatcher.end("all");
      }
  }
  else{
    message.reply("I'm not in a voice channel!");
  }
  }
  else if(args[0]===PREFIX+'pause' && args.length===1){
    if(voiceChannel){
    if(dispatcher.paused && isPlaying){
      message.reply("I'm already paused!");
    }
    else if(!dispatcher.paused && !isPlaying){
      message.reply("I'm not even playing songs!");
    }
    else{
      dispatcher.pause();
    }
  }
  else{
    message.reply("I'm not in a voice channel!");
  }
  }
  else if(args[0]===PREFIX+'resume' && args.length===1){

    if(voiceChannel){

    if(!dispatcher.paused && isPlaying){
      message.reply("I'm already playing songs!");
    }
    else if(!dispatcher.paused && !isPlaying){
      message.reply("I'm not even playing songs!");
    }
    else{
      dispatcher.resume();
    }
  }
  else{
    message.reply("I'm not in a voice channel!");
  }

  }
  else if(args[0]===PREFIX+'leave' && args.length===1){
    if(voiceChannel){
      voiceChannel.leave();
      voiceChannel=null;
      dispatcher=null;
      isPlaying=false;
      while(!queue.isEmpty()){
        queue.dequeue();
      }
      message.reply("Bye!");
    }
    else{
      message.reply("I'm not in a voice channel!");
    }
  }
});

function playMusic(id, message){
  voiceChannel=message.member.voiceChannel;

  voiceChannel.join().then(connection =>{
    stream = ytdl("https://www.youtube.com/watch?v="+ id, {
      filter: 'audioonly'
    });
    dispatcher = connection.playStream(stream);
    dispatcher.on('end', (reason) =>{

        if(reason === "all"){
          queue.clear();
          isPlaying= false;
          client.user.setActivity('type !help for commands');
        }
      else{
        queue.dequeue();
        if(queue.size() === 0){
          isPlaying=false;
          client.user.setActivity('type !help for commands');
        }
        else{
          playMusic(queue.peek(), message);
          fetchVideoInfo(queue.peek(), (err, videoInfo)=>{
            client.user.setActivity(videoInfo.title);
          });

        }
      }
    });
  });

}

function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + YT_API_KEY, function(error, response, body) {
        var json = JSON.parse(body);
        if (!json.items[0]) callback("3_-a9nVZYjk");
        else {
            callback(json.items[0].id.videoId);
        }
    });
}

function isYoutube(str) {
    return str.toLowerCase().indexOf("youtube.com") > -1;
}

function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYouTubeID(str));
    } else {
        search_video(str, function(id) {
            cb(id);
        });
    }
}

function add_to_queue(strID, message) {
    if (isYoutube(strID)) {
        queue.enqueue(getYouTubeID(strID));
    } else {
        queue.enqueue(strID);
    }
}

client.login(BOT_TOKEN);
