import{r as f,a as Ee,R as Me}from"./vendor-b1791c80.js";(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const c of document.querySelectorAll('link[rel="modulepreload"]'))o(c);new MutationObserver(c=>{for(const d of c)if(d.type==="childList")for(const r of d.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function h(c){const d={};return c.integrity&&(d.integrity=c.integrity),c.referrerPolicy&&(d.referrerPolicy=c.referrerPolicy),c.crossOrigin==="use-credentials"?d.credentials="include":c.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function o(c){if(c.ep)return;c.ep=!0;const d=h(c);fetch(c.href,d)}})();var ae={exports:{}},Q={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var De=f,Ie=Symbol.for("react.element"),Ae=Symbol.for("react.fragment"),Re=Object.prototype.hasOwnProperty,We=De.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,$e={key:!0,ref:!0,__self:!0,__source:!0};function oe(g,s,h){var o,c={},d=null,r=null;h!==void 0&&(d=""+h),s.key!==void 0&&(d=""+s.key),s.ref!==void 0&&(r=s.ref);for(o in s)Re.call(s,o)&&!$e.hasOwnProperty(o)&&(c[o]=s[o]);if(g&&g.defaultProps)for(o in s=g.defaultProps,s)c[o]===void 0&&(c[o]=s[o]);return{$$typeof:Ie,type:g,key:d,ref:r,props:c,_owner:We.current}}Q.Fragment=Ae;Q.jsx=oe;Q.jsxs=oe;ae.exports=Q;var e=ae.exports,V={},ee=Ee;V.createRoot=ee.createRoot,V.hydrateRoot=ee.hydrateRoot;const Oe=({isOpen:g,onClose:s,currentCategory:h,currentBadge:o})=>{const[c,d]=f.useState([]),[r,R]=f.useState(""),[p,k]=f.useState(!1),v=f.useRef(null),_=()=>{var i;(i=v.current)==null||i.scrollIntoView({behavior:"smooth"})};f.useEffect(()=>{_()},[c]);const $=async()=>{if(!r.trim()||p)return;const i={id:Date.now().toString(),text:r,isUser:!0,timestamp:new Date};d(T=>[...T,i]),R(""),k(!0);try{const T=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:r,user_id:"web_user",context:{current_view:"chat",current_category:h?{id:h.id,title:h.title,emoji:h.emoji}:null,current_badge:o?{id:o.id,title:o.title,emoji:o.emoji,category_id:o.categoryId}:null}})}),C=await T.json();if(T.ok){const E={id:(Date.now()+1).toString(),text:C.response||"Извините, произошла ошибка",isUser:!1,timestamp:new Date};d(b=>[...b,E])}else{const E={id:(Date.now()+1).toString(),text:C.message||"Чат-бот временно недоступен",isUser:!1,timestamp:new Date};d(b=>[...b,E])}}catch{const C={id:(Date.now()+1).toString(),text:"Ошибка соединения. Проверьте, что чат-бот запущен.",isUser:!1,timestamp:new Date};d(E=>[...E,C])}finally{k(!1)}},B=i=>{i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),$())};return g?e.jsxs("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"transparent",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",zIndex:1e3,padding:"20px",animation:"fadeIn 0.3s ease-out",pointerEvents:"none"},children:[e.jsxs("div",{style:{background:"linear-gradient(135deg, rgba(12, 12, 12, 0.6) 0%, rgba(26, 26, 46, 0.6) 50%, rgba(22, 33, 62, 0.6) 100%)",borderRadius:"24px",boxShadow:"0 30px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(78, 205, 196, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",width:"400px",height:"600px",display:"flex",flexDirection:"column",fontFamily:"system-ui, -apple-system, sans-serif",border:"1px solid rgba(78, 205, 196, 0.5)",animation:"slideInFromRight 0.4s ease-out",backdropFilter:"blur(20px)",marginTop:"20px",pointerEvents:"auto"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px",borderBottom:"1px solid rgba(78, 205, 196, 0.3)",background:"rgba(78, 205, 196, 0.08)",borderRadius:"24px 24px 0 0"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"12px"},children:[e.jsxs("div",{style:{position:"relative"},children:[e.jsx("img",{src:"/Валюша.jpg",alt:"НейроВалюша",style:{width:"40px",height:"40px",borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(78, 205, 196, 0.6)",boxShadow:"0 0 15px rgba(78, 205, 196, 0.3)"}}),e.jsx("div",{style:{position:"absolute",bottom:"-1px",right:"-1px",width:"12px",height:"12px",background:"#4ecdc4",borderRadius:"50%",border:"2px solid rgba(12, 12, 12, 0.95)",boxShadow:"0 0 8px rgba(78, 205, 196, 0.5)"}})]}),e.jsxs("div",{children:[e.jsx("h3",{style:{fontSize:"16px",fontWeight:"700",color:"#4ecdc4",margin:0,textShadow:"0 0 8px rgba(78, 205, 196, 0.3)"},children:"НейроВалюша"}),e.jsx("p",{style:{fontSize:"12px",color:"#a0aec0",margin:0,fontWeight:"500"},children:"✨ Нейро вожатый"})]})]}),e.jsx("button",{onClick:s,style:{color:"#a0aec0",background:"rgba(78, 205, 196, 0.1)",border:"1px solid rgba(78, 205, 196, 0.3)",cursor:"pointer",padding:"6px",borderRadius:"6px",transition:"all 0.3s ease"},onMouseEnter:i=>{i.currentTarget.style.background="rgba(78, 205, 196, 0.2)",i.currentTarget.style.color="#4ecdc4"},onMouseLeave:i=>{i.currentTarget.style.background="rgba(78, 205, 196, 0.1)",i.currentTarget.style.color="#a0aec0"},children:e.jsx("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})})})]}),(h||o)&&e.jsx("div",{style:{padding:"10px 16px",background:"rgba(78, 205, 196, 0.08)",borderBottom:"1px solid rgba(78, 205, 196, 0.2)",borderLeft:"3px solid #4ecdc4"},children:e.jsxs("div",{style:{fontSize:"12px",color:"#4ecdc4",fontWeight:"500"},children:[h&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx("span",{style:{fontSize:"14px"},children:"📁"}),e.jsxs("span",{children:["Категория: ",h.emoji," ",h.title]})]}),o&&e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"6px",marginTop:h?"3px":"0"},children:[e.jsx("span",{style:{fontSize:"14px"},children:"🏆"}),e.jsxs("span",{children:["Значок: ",o.emoji," ",o.title]})]})]})}),e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:"20px",background:"rgba(0, 0, 0, 0.05)",borderRadius:"0 0 24px 24px"},children:[c.length===0&&e.jsxs("div",{style:{textAlign:"center",color:"#a0aec0",padding:"30px 0"},children:[e.jsxs("div",{style:{position:"relative",display:"inline-block",marginBottom:"20px"},children:[e.jsx("img",{src:"/Валюша.jpg",alt:"НейроВалюша",style:{width:"80px",height:"80px",borderRadius:"50%",objectFit:"cover",border:"3px solid rgba(78, 205, 196, 0.7)",boxShadow:"0 0 25px rgba(78, 205, 196, 0.5)"}}),e.jsx("div",{style:{position:"absolute",top:"-5px",right:"-5px",width:"20px",height:"20px",background:"#4ecdc4",borderRadius:"50%",border:"2px solid rgba(12, 12, 12, 0.95)",boxShadow:"0 0 12px rgba(78, 205, 196, 0.7)",animation:"pulse 2s infinite"}})]}),e.jsx("h3",{style:{fontSize:"20px",fontWeight:"700",color:"#4ecdc4",margin:"0 0 12px 0",textShadow:"0 0 10px rgba(78, 205, 196, 0.4)"},children:"Привет! 😊"}),e.jsx("p",{style:{fontSize:"14px",margin:"0 0 8px 0",fontWeight:"500",color:"#e2e8f0",lineHeight:"1.4"},children:"Я здесь чтобы помочь!"}),e.jsx("p",{style:{fontSize:"12px",margin:"0",opacity:"0.9",color:"#a0aec0",lineHeight:"1.4"},children:"Если что-то не понятно — спрашивай! 💫"})]}),c.map(i=>e.jsx("div",{style:{display:"flex",justifyContent:i.isUser?"flex-end":"flex-start",marginBottom:"8px"},children:e.jsxs("div",{style:{maxWidth:"85%",padding:"12px 16px",borderRadius:i.isUser?"16px 16px 4px 16px":"16px 16px 16px 4px",background:i.isUser?"linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)":"rgba(78, 205, 196, 0.1)",color:i.isUser?"white":"#e2e8f0",border:i.isUser?"1px solid rgba(78, 205, 196, 0.3)":"1px solid rgba(78, 205, 196, 0.2)",boxShadow:i.isUser?"0 6px 20px rgba(78, 205, 196, 0.3)":"0 3px 12px rgba(0, 0, 0, 0.1)",backdropFilter:"blur(10px)"},children:[e.jsx("p",{style:{fontSize:"13px",margin:0,whiteSpace:"pre-wrap",lineHeight:"1.4",fontWeight:"500"},children:i.text}),e.jsx("p",{style:{fontSize:"10px",marginTop:"6px",color:i.isUser?"rgba(255, 255, 255, 0.7)":"rgba(160, 174, 192, 0.6)",fontWeight:"400"},children:i.timestamp.toLocaleTimeString()})]})},i.id)),p&&e.jsx("div",{style:{display:"flex",justifyContent:"flex-start"},children:e.jsx("div",{style:{maxWidth:"85%",padding:"12px 16px",borderRadius:"16px 16px 16px 4px",background:"rgba(78, 205, 196, 0.1)",border:"1px solid rgba(78, 205, 196, 0.2)",boxShadow:"0 3px 12px rgba(0, 0, 0, 0.1)",backdropFilter:"blur(10px)"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsx("div",{style:{width:"16px",height:"16px",border:"2px solid rgba(78, 205, 196, 0.3)",borderTop:"2px solid #4ecdc4",borderRadius:"50%",animation:"spin 1s linear infinite"}}),e.jsx("span",{style:{fontSize:"13px",color:"#a0aec0",fontWeight:"500"},children:"НейроВалюша печатает..."})]})})}),e.jsx("div",{ref:v})]}),e.jsx("div",{style:{padding:"16px",borderTop:"1px solid rgba(78, 205, 196, 0.3)",background:"rgba(78, 205, 196, 0.05)",borderRadius:"0 0 24px 24px"},children:e.jsxs("div",{style:{display:"flex",gap:"8px",alignItems:"flex-end"},children:[e.jsx("input",{type:"text",value:r,onChange:i=>R(i.target.value),onKeyPress:B,placeholder:"Напишите сообщение...",style:{flex:1,padding:"12px 16px",border:"1px solid rgba(78, 205, 196, 0.3)",borderRadius:"16px",fontSize:"14px",outline:"none",background:"rgba(12, 12, 12, 0.6)",color:"#e2e8f0",backdropFilter:"blur(10px)",transition:"all 0.3s ease"},disabled:p,onFocus:i=>{i.target.style.borderColor="rgba(78, 205, 196, 0.6)",i.target.style.boxShadow="0 0 0 2px rgba(78, 205, 196, 0.2)"},onBlur:i=>{i.target.style.borderColor="rgba(78, 205, 196, 0.3)",i.target.style.boxShadow="none"}}),e.jsx("button",{onClick:$,disabled:!r.trim()||p,style:{padding:"12px 16px",background:"linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)",color:"white",border:"none",borderRadius:"16px",fontSize:"14px",fontWeight:"600",cursor:"pointer",opacity:!r.trim()||p?.5:1,boxShadow:"0 6px 20px rgba(78, 205, 196, 0.3)",transition:"all 0.3s ease",minWidth:"80px"},onMouseEnter:i=>{i.currentTarget.disabled||(i.currentTarget.style.transform="translateY(-2px)",i.currentTarget.style.boxShadow="0 8px 25px rgba(78, 205, 196, 0.4)")},onMouseLeave:i=>{i.currentTarget.style.transform="translateY(0)",i.currentTarget.style.boxShadow="0 6px 20px rgba(78, 205, 196, 0.3)"},children:"Отправить"})]})})]}),e.jsx("style",{dangerouslySetInnerHTML:{__html:`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes slideInFromRight {
            0% { 
              transform: translateX(100%);
              opacity: 0;
            }
            100% { 
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}})]}):null},Le=({onClick:g,isOpen:s=!1,className:h=""})=>e.jsxs("button",{onClick:g,className:`chat-button ${h}`,title:s?"Закрыть чат":"Открыть чат",style:{position:"fixed",bottom:"24px",right:"24px",zIndex:1001,background:s?"linear-gradient(135deg, rgba(255, 107, 107, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(46, 26, 26, 0.95) 100%)":"linear-gradient(135deg, rgba(78, 205, 196, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(26, 26, 46, 0.95) 100%)",border:s?"2px solid rgba(255, 107, 107, 0.6)":"2px solid rgba(78, 205, 196, 0.6)",color:"white",padding:"16px 20px",borderRadius:"25px",boxShadow:s?"0 15px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 107, 107, 0.3)":"0 15px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(78, 205, 196, 0.3)",cursor:"pointer",transition:"all 0.3s ease",display:"flex",alignItems:"center",gap:"12px",fontFamily:"system-ui, -apple-system, sans-serif",backdropFilter:"blur(10px)",minWidth:"200px"},onMouseEnter:o=>{s?(o.currentTarget.style.background="linear-gradient(135deg, rgba(255, 107, 107, 1) 0%, rgba(12, 12, 12, 1) 50%, rgba(46, 26, 26, 1) 100%)",o.currentTarget.style.boxShadow="0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 107, 107, 0.8)",o.currentTarget.style.borderColor="rgba(255, 107, 107, 1)"):(o.currentTarget.style.background="linear-gradient(135deg, rgba(78, 205, 196, 1) 0%, rgba(12, 12, 12, 1) 50%, rgba(26, 26, 46, 1) 100%)",o.currentTarget.style.boxShadow="0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(78, 205, 196, 0.8)",o.currentTarget.style.borderColor="rgba(78, 205, 196, 1)"),o.currentTarget.style.transform="scale(1.05) translateY(-2px)"},onMouseLeave:o=>{s?(o.currentTarget.style.background="linear-gradient(135deg, rgba(255, 107, 107, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(46, 26, 26, 0.95) 100%)",o.currentTarget.style.boxShadow="0 15px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 107, 107, 0.3)",o.currentTarget.style.borderColor="rgba(255, 107, 107, 0.6)"):(o.currentTarget.style.background="linear-gradient(135deg, rgba(78, 205, 196, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(26, 26, 46, 0.95) 100%)",o.currentTarget.style.boxShadow="0 15px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(78, 205, 196, 0.3)",o.currentTarget.style.borderColor="rgba(78, 205, 196, 0.6)"),o.currentTarget.style.transform="scale(1) translateY(0)"},children:[e.jsxs("div",{style:{position:"relative"},children:[e.jsx("img",{src:"/public/Валюша.jpg",alt:"НейроВалюша",style:{width:"40px",height:"40px",borderRadius:"50%",objectFit:"cover",border:"3px solid rgba(78, 205, 196, 0.8)",boxShadow:"0 0 15px rgba(78, 205, 196, 0.4)"}}),e.jsx("div",{style:{position:"absolute",bottom:"-2px",right:"-2px",width:"14px",height:"14px",background:s?"#ff6b6b":"#4ecdc4",borderRadius:"50%",border:"2px solid rgba(12, 12, 12, 0.95)",boxShadow:s?"0 0 8px rgba(255, 107, 107, 0.6)":"0 0 8px rgba(78, 205, 196, 0.6)"}})]}),e.jsxs("div",{style:{display:window.innerWidth>=640?"block":"none"},children:[e.jsx("div",{style:{fontSize:"16px",fontWeight:"700",lineHeight:"1.2",color:s?"#ff6b6b":"#4ecdc4",textShadow:s?"0 0 8px rgba(255, 107, 107, 0.3)":"0 0 8px rgba(78, 205, 196, 0.3)"},children:"НейроВалюша"}),e.jsx("div",{style:{fontSize:"12px",opacity:.9,lineHeight:"1.2",color:"#a0aec0",fontWeight:"500"},children:"Нейро вожатый"})]}),e.jsx("div",{style:{position:"absolute",top:"-6px",right:"-6px",width:"16px",height:"16px",background:s?"#ff6b6b":"#4ecdc4",borderRadius:"50%",border:"2px solid rgba(12, 12, 12, 0.95)",boxShadow:s?"0 0 12px rgba(255, 107, 107, 0.6)":"0 0 12px rgba(78, 205, 196, 0.6)",animation:"pulse 2s infinite"}}),e.jsx("style",{dangerouslySetInnerHTML:{__html:`
          @keyframes pulse {
            0% {
              transform: scale(0.95);
              box-shadow: 0 0 0 0 rgba(78, 205, 196, 0.7);
            }
            70% {
              transform: scale(1);
              box-shadow: 0 0 0 12px rgba(78, 205, 196, 0);
            }
            100% {
              transform: scale(0.95);
              box-shadow: 0 0 0 0 rgba(78, 205, 196, 0);
            }
          }
        `}})]}),te=g=>g&&g.replace(/([.!?])\s*([А-ЯЁ][а-яё]+:)/g,`$1

$2`).replace(/([.!?])\s*([А-ЯЁ][а-яё]{2,} [А-ЯЁ][а-яё]+:)/g,`$1

$2`).replace(/([.!?])\s*([А-ЯЁ][а-яё]{3,} [А-ЯЁ][а-яё]+)/g,`$1

$2`).replace(/\n{3,}/g,`

`).trim(),re=g=>g&&g.replace(/([.!?])\s*•/g,`$1

•`).replace(/([.!?])\s*([А-ЯЁ][а-яё]+:)/g,`$1

$2`).replace(/([.!?])\s*Например:/g,`$1

Например:`).replace(/([.!?])\s*Это может быть:/g,`$1

Это может быть:`).replace(/(•[^•]*?)\n{2,}(•)/g,`$1
$2`).replace(/(•[^•]*?)\n{3,}(•)/g,`$1
$2`).replace(/(•[^•]*?)\n\n\n(•)/g,`$1
$2`).replace(/(•[^•]*?)\n\n\n\n(•)/g,`$1
$2`).replace(/(•[^•]*?)(\n{2,})(•)/g,`$1
$3`).replace(/(включая:)\n(•)/g,`$1

$2`).replace(/\n{3,}/g,`

`).trim(),G=g=>{if(!g)return{mainText:g,evidenceText:null};const s=g.match(/(Чем подтверждается:.*?)(?=\n\n|$)/s);if(s){const h=s[1].trim();return{mainText:g.replace(s[0],"").trim(),evidenceText:h}}return{mainText:g,evidenceText:null}},X=g=>![].includes(g),Be=g=>{switch(g){case"12":return e.jsx("img",{src:"./pictures/ии 2.png",alt:"ИИ"});case"13":return e.jsx("img",{className:"category-13-icon",src:"./pictures/софт скиллз.png",alt:"Категория 13"});case"2":return e.jsx("img",{className:"category-2-icon",src:"./pictures/stanpol__kittens_0482e39f-9d2d-4929-a25b-1888131d0cf2.png",alt:"Категория 2"});case"3":return e.jsx("img",{className:"category-3-icon",src:"./pictures/Stan_Pol__beutiful_camera__vector_logo_e16e2508-69e8-4bf6-9cdf-8b7012558c5e.png",alt:"Категория 3"});case"8":return e.jsx("img",{className:"category-8-icon",src:"./pictures/stanpol__kittens_840096ea-9470-4d6c-b8bc-0e8ab4703a38.png",alt:"Категория 8"});case"9":return e.jsx("img",{className:"category-9-icon",src:"./pictures/stanpol__The_mighty_kitten_guardian_of_light_a_halo_of_bright_m_56a19c5f-dfa8-4d0c-beb0-4f2e15d29dbb.png",alt:"Категория 9"});case"1":return e.jsx("img",{src:"./pictures/stanpol__soviet_wave__actual_design__yellow_and_red_stars_on_a__326a67a1-e41c-4a9a-be9a-29c51d05b0a9.png",alt:"Категория 1"});case"7":return e.jsx("img",{className:"category-7-icon",src:"./pictures/Stan_Pol__beutiful_electric_guitar__vector_logo_78eadd19-04e1-4a7e-b538-865c6dd62d71.png",alt:"Категория 7"});case"6":return e.jsx("img",{className:"category-6-icon",src:"./pictures/Stan_Pol__magic_broom__4k__vector_logo_bdb44597-56aa-4530-92f6-104178793d0b.png",alt:"Категория 6"});case"10":return e.jsx("img",{className:"category-10-icon",src:"./pictures/Stan_Pol__beutiful_lighthouse__vector_logo_5c815e45-0aa8-48e0-9cd4-9ab06fc0b735.png",alt:"Категория 10"});case"11":return e.jsx("img",{className:"category-11-icon",src:"./pictures/stanpol__A_modern_logo_for_a_Neuro_shift_themed_camp_combining__577b1903-fc11-49cd-85a6-91211e30ec56.png",alt:"Категория 11"});case"5":return e.jsx("img",{className:"category-5-icon",src:"./pictures/Stan_Pol_realistic_campfire__vector_logo__in_the_style_of_a_glo_5b853e9f-93d3-4a2e-aa6a-f3345776e834.png",alt:"Категория 5"});case"4":return e.jsx("img",{className:"category-4-icon",src:"./pictures/Stan_Pol_beautiful_star__neon__4k__vector_logo_fbadf503-7e7b-4c8d-949f-e75c9a43b636.png",alt:"Категория 4"});case"14":return e.jsx("img",{className:"category-14-icon",src:"./pictures/stanpol___kittens_astronauts__against_the_background_of_a_magic_c43ee4e3-1f7c-45c2-8263-065fe08abf49.png",alt:"Категория 14"});default:return"🏆"}},ie={"1.1":{tallOn:["1.1.1","1.1.2","1.1.3"],textMaxEm:32},"1.2":{tallOn:["1.2.1","1.2.2","1.2.3"],textMaxEm:32},"1.3":{tallOn:["1.3.1","1.3.2","1.3.3"],textMaxEm:32},"1.4":{tallOn:["1.4.1","1.4.2"],textMaxEm:32},"1.5":{tallOn:["1.5.1","1.5.2","1.5.3"],textMaxEm:32},"2.1":{tallOn:["2.1.1","2.1.2"],textMaxEm:32},"2.2":{tallOn:["2.2.1","2.2.2"],textMaxEm:32},"2.3":{tallOn:["2.3.1","2.3.2"],textMaxEm:32},"2.4":{tallOn:["2.4.1","2.4.2"],textMaxEm:32},"2.5":{tallOn:["2.5"],textMaxEm:32},"2.6":{tallOn:["2.6.1","2.6.2"],textMaxEm:32},"2.7":{tallOn:["2.7.1","2.7.2"],textMaxEm:32},"2.8":{tallOn:["2.8.1","2.8.2"],textMaxEm:32},"2.9":{tallOn:["2.9.1","2.9.2"],textMaxEm:32},"3.1":{tallOn:["3.1.1","3.1.2","3.1.3"],textMaxEm:32},"3.2":{tallOn:["3.2.1","3.2.2","3.2.3"],textMaxEm:32},"3.3":{tallOn:["3.3.1","3.3.2","3.3.3"],textMaxEm:32},"4.1":{tallOn:["4.1"],textMaxEm:32},"4.2":{tallOn:["4.2.1","4.2.2","4.2.3"],textMaxEm:32},"4.3":{tallOn:["4.3.1","4.3.2","4.3.3"],textMaxEm:32},"4.4":{tallOn:["4.4.1","4.4.2","4.4.3"],textMaxEm:32},"5.1":{tallOn:["5.1.1","5.1.2","5.1.3"],textMaxEm:32},"5.2":{tallOn:["5.2"],textMaxEm:32},"5.3":{tallOn:["5.3"],textMaxEm:32},"5.4":{tallOn:["5.4.1","5.4.2","5.4.3"],textMaxEm:32},"5.5":{tallOn:["5.5.1","5.5.2","5.5.3"],textMaxEm:32},"5.6":{tallOn:["5.6.1","5.6.2","5.6.3"],textMaxEm:32},"5.7":{tallOn:["5.7.1","5.7.2","5.7.3"],textMaxEm:32},"6.1":{tallOn:["6.1.1","6.1.2","6.1.3"],textMaxEm:32},"6.2":{tallOn:["6.2.1","6.2.2","6.2.3"],textMaxEm:32},"6.3":{tallOn:["6.3.1","6.3.2","6.3.3"],textMaxEm:32},"6.4":{tallOn:["6.4.1","6.4.2","6.4.3"],textMaxEm:32}},Ye=()=>{const[g,s]=f.useState([]),[h,o]=f.useState([]),[c,d]=f.useState("intro"),[r,R]=f.useState(null),[p,k]=f.useState(null),[v,_]=f.useState(""),[$,B]=f.useState(null),[i,T]=f.useState(!0),[C,E]=f.useState(!1),[b,ne]=f.useState({childName:"",parentName:"",phone:"",email:"",childAge:"",specialRequests:""});f.useEffect(()=>{console.log("App: Component mounted, loading data"),se()},[]);const se=async()=>{try{console.log("App: Loading data..."),T(!0);const t=[{id:"1",title:"За личные достижения",badge_count:16,expected_badges:16},{id:"2",title:"За легендарные дела",badge_count:6,expected_badges:6},{id:"3",title:"Медиа значки",badge_count:3,expected_badges:3},{id:"4",title:"За лагерные дела",badge_count:4,expected_badges:4},{id:"5",title:"За отрядные дела",badge_count:10,expected_badges:10},{id:"6",title:"Гармония и порядок",badge_count:4,expected_badges:4},{id:"7",title:"За творческие достижения",badge_count:8,expected_badges:8},{id:"8",title:"Значки Движков",badge_count:7,expected_badges:7},{id:"9",title:"Значки Бро – Движения",badge_count:10,expected_badges:10},{id:"10",title:"Значки на флаг отряда",badge_count:3,expected_badges:3},{id:"11",title:"Осознанность",badge_count:16,expected_badges:16},{id:"12",title:"ИИ: нейросети для обучения и творчества",badge_count:12,expected_badges:12},{id:"13",title:"Софт-скиллз интенсив — развитие гибких навыков",badge_count:12,expected_badges:12},{id:"14",title:"Значки Инспектора Пользы",badge_count:9,expected_badges:9}];s(t),o([]),console.log("App: Data loaded:",t.length,"categories")}catch(t){console.error("Ошибка загрузки данных:",t),s([{id:"1",title:"За личные достижения",badge_count:16,expected_badges:16},{id:"2",title:"За легендарные дела",badge_count:6,expected_badges:6},{id:"3",title:"Медиа значки",badge_count:3,expected_badges:3},{id:"4",title:"За лагерные дела",badge_count:4,expected_badges:4},{id:"5",title:"За отрядные дела",badge_count:10,expected_badges:10},{id:"6",title:"Гармония и порядок",badge_count:4,expected_badges:4},{id:"7",title:"За творческие достижения",badge_count:8,expected_badges:8},{id:"8",title:"Значки Движков",badge_count:7,expected_badges:7},{id:"9",title:"Значки Бро – Движения",badge_count:10,expected_badges:10},{id:"10",title:"Значки на флаг отряда",badge_count:3,expected_badges:3},{id:"11",title:"Осознанность",badge_count:16,expected_badges:16},{id:"12",title:"ИИ: нейросети для обучения и творчества",badge_count:12,expected_badges:12},{id:"13",title:"Софт-скиллз интенсив — развитие гибких навыков",badge_count:12,expected_badges:12},{id:"14",title:"Значки Инспектора Пользы",badge_count:9,expected_badges:9}])}finally{T(!1),console.log("App: Loading completed")}},le=()=>{console.log("App: Intro clicked - switching to categories view"),d("categories"),R(null),k(null),_("")},U=t=>{console.log("Клик по категории:",t.title),R(t),d("category"),k(null),_(""),console.log("Установлен currentView:","category")},de=t=>{console.log("App: Badge clicked:",t.title),k(t),d("badge"),_("")},ce=t=>{console.log("App: Level clicked:",t),_(t),d("badge-level")},pe=()=>{console.log("App: Introduction clicked"),d("introduction")},ge=()=>{d("registration-form")},xe=()=>{const t=`🎪 Заявка на осеннюю смену "Осенний 4К-вайб в Реальном Лагере"

👶 Имя ребёнка: ${b.childName}
👨‍👩‍👧‍👦 Имя родителя: ${b.parentName}
📞 Телефон: ${b.phone}
📧 Email: ${b.email}
🎂 Возраст ребёнка: ${b.childAge}
💭 Особые пожелания: ${b.specialRequests}

Готовы записаться на смену! 🚀`,l=`https://t.me/Stivanovv?text=${encodeURIComponent(t)}`;window.open(l,"_blank")},O=(t,l)=>{ne(m=>({...m,[t]:l}))},me=()=>{d("about-camp")},P=(t,l)=>{var a,n;if(console.log("App: Additional material clicked:",t,l),!(r!=null&&r.additional_materials))return;const m=t==="checklist"?(a=r.additional_materials.checklists)==null?void 0:a[l]:(n=r.additional_materials.methodology)==null?void 0:n[l];m&&(B({type:t,key:l,title:m.title,content:m.html}),d("additional-material"))},he=()=>{console.log("App: Back to categories clicked"),d("categories"),R(null),k(null),_("")},be=()=>{console.log("App: Back to badge clicked"),d("badge"),_("")},Z=()=>{d("intro"),R(null),k(null),_("")},ue=()=>{d("about-camp")},fe=()=>{console.log("App: Back to category clicked"),d("category"),k(null),_(""),B(null)},je=()=>{console.log("App: Back to category from introduction clicked"),d("category")},ve=()=>{console.log("App: Back to category from additional material clicked"),d("category"),B(null)},ye=()=>e.jsxs("div",{className:"intro-screen",children:[e.jsxs("div",{className:"intro-logo",onClick:ue,children:[e.jsx("img",{src:"./pictures/домик_AI.jpg",alt:"Логотип"}),e.jsx("div",{className:"logo-hover-text",children:"ОСЕННЯЯ СМЕНА 2025"})]}),e.jsxs("div",{className:"intro-content",children:[e.jsx("h1",{children:"Путеводитель по Реальному Лагерю"}),e.jsx("p",{children:"Добро пожаловать в космическое путешествие по системе значков и достижений! Здесь вы найдете 242 значка в 14 категориях."}),e.jsxs("div",{className:"philosophy-section",children:[e.jsx("p",{className:"philosophy-main",children:e.jsx("strong",{children:"Значки здесь — не награды, а маршруты развития."})}),e.jsx("p",{children:"В Реальном Лагере значки — не просто «ачивки» за выполнение заданий. Это путеводные звёзды, которые помогают выбрать твой собственный путь. Каждый значок — не медаль за прошлое, а маяк, освещающий направления твоего развития."}),e.jsxs("div",{className:"philosophy-points",children:[e.jsxs("div",{className:"point",children:[e.jsx("span",{className:"point-icon",children:"🎯"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Реальный Значок = Опыт."}),e.jsx("br",{}),"Здесь главная награда — не значок, а опыт и навыки, которые ты получаешь, выполняя задания. Новые друзья, настоящие проекты, полезные привычки и идеи — всё это остаётся с тобой."]})]}),e.jsxs("div",{className:"point",children:[e.jsx("span",{className:"point-icon",children:"🧭"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Реальный Значок — не награда, а компас."}),e.jsx("br",{}),"Только ты выбираешь, какие значки будут на твоём пути. Вожатые и Путеводитель предложат варианты, но выбор и движение всегда за тобой."]})]})]}),e.jsxs("p",{className:"philosophy-ending",children:[e.jsx("strong",{children:"🔥 Добро пожаловать в Реальный Лагерь."}),e.jsx("br",{}),"Выбирай звезду, двигайся вперёд, оставляй след.",e.jsx("br",{}),"Твой опыт — твой путь. Реальные Значки подскажут, куда идти."]})]}),e.jsx("p",{className:"start-instruction",children:"Нажмите кнопку, чтобы начать исследование созвездий значков."}),e.jsx("button",{onClick:le,className:"start-button",children:"Начать путешествие"})]})]}),_e=()=>{const t=l=>{const y=60+Math.min(Math.max((l-3)/37,0),1)*(120-60);return Math.round(y)};return e.jsxs("div",{className:"categories-screen",children:[e.jsxs("div",{className:"header",children:[e.jsx("button",{onClick:Z,className:"back-button",children:"← Назад к приветствию"}),e.jsx("h1",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0,0,0,0.8)",fontWeight:"bold"},children:"Категории значков"}),e.jsx("p",{style:{color:"#FFA500",textShadow:"1px 1px 2px rgba(0,0,0,0.6)",fontWeight:"600"},children:"Выберите категорию для изучения"})]}),e.jsx("div",{className:"categories-grid",children:g.map((l,m)=>{const a=t(l.badge_count);return e.jsxs("div",{className:"category-container floating",style:{animationDelay:`${m*.2}s`},children:[e.jsx("div",{className:"category-card",style:{width:`${a}px`,height:`${a}px`},onClick:()=>U(l),children:e.jsx("div",{className:"category-icon",children:Be(l.id)})}),e.jsxs("div",{className:"category-text",children:[e.jsx("h3",{children:l.title}),e.jsxs("p",{children:[l.badge_count," значков"]})]})]},l.id)})})]})},we=()=>{var l;if(console.log("renderCategory вызван, selectedCategory:",r),!r)return console.log("selectedCategory отсутствует, возвращаем null"),null;const t=h.filter(m=>m.category_id===r.id&&(m.level==="Базовый уровень"||m.level==="Одноуровневый"||m.level==="Вожатский уровень"||(r.id==="8"||r.id==="9")&&m.id!=="8.5.2"&&m.id!=="8.5.3"));return e.jsxs("div",{className:"category-screen",children:[e.jsxs("div",{className:"header",children:[e.jsx("button",{onClick:he,className:"back-button",children:"← Назад к категориям"}),e.jsxs("div",{className:"header-content",children:[e.jsx("h1",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0,0,0,0.8)",fontWeight:"bold"},children:r.title}),e.jsxs("p",{style:{color:"#FFA500",textShadow:"1px 1px 2px rgba(0,0,0,0.6)",fontWeight:"600"},children:[t.length," базовых значков"]}),((l=r.introduction)==null?void 0:l.has_introduction)&&e.jsx("button",{onClick:pe,className:"hint-button",title:"Показать подсказку по категории",children:"💡 Подсказка"}),r.id==="14"&&r.additional_materials&&e.jsxs("div",{className:"additional-materials-buttons",children:[r.additional_materials.checklists&&e.jsxs(e.Fragment,{children:[e.jsx("button",{onClick:()=>P("checklist","general-checklist.md"),className:"material-button",title:"Общий чек-лист",children:"📋 Чек-лист"}),e.jsx("button",{onClick:()=>P("checklist","challenges-checklist.md"),className:"material-button",title:"Чек-лист с челленджами",children:"🎯 Челленджи"}),e.jsx("button",{onClick:()=>P("checklist","active-checklist.md"),className:"material-button",title:"Активная версия чек-листа",children:"🚀 Активная версия"})]}),r.additional_materials.methodology&&e.jsx("button",{onClick:()=>P("methodology","inspector-methodology.md"),className:"material-button",title:"Методика Инспектора Пользы",children:"📚 Методика"})]})]})]}),e.jsx("div",{className:"badges-grid",children:t.map((m,a)=>e.jsxs("article",{className:"badge-card floating",style:{animationDelay:`${a*.1}s`},onClick:()=>de(m),children:[e.jsx("div",{className:"badge-card__icon",children:e.jsx("div",{className:"badge-emoji",children:m.emoji||(m.id==="1.11"?"♾️":"")})}),e.jsx("h3",{className:"badge-card__title",children:m.title}),e.jsx("div",{className:"badge-card__level",children:m.level})]},m.id))})]})},ke=()=>{var z,L,I;if(!p)return null;const t=(p.id||"").split("."),l=t.length===3,m=l?t.slice(0,2).join(".")+".":p.id,a=h.filter(x=>x.category_id!==p.category_id?!1:l?(x.id||"").startsWith(m):x.id===p.id),n=l?a.find(x=>(x.level||"").toLowerCase().includes("базовый"))||null:p;let N=null,M=[];const y=n||p;if(y&&(y.confirmation&&(N=y.confirmation),y.criteria)){const x=y.criteria.replace(/^Как получить значок «[^»]+»:\s*/,""),S=X(y.id)?re(x):x;if(y.confirmation){const{mainText:j,evidenceText:A}=G(S);N=A||y.confirmation,M=j.split("✅").filter(W=>W.trim()).map(W=>W.trim())}else{const{mainText:j,evidenceText:A}=G(S);N=A,M=j.split("✅").filter(W=>W.trim()).map(W=>W.trim())}}const q=(n==null?void 0:n.description)||p.description||"",D=(z=p.id)==null?void 0:z.split(".").slice(0,2).join("."),F=ie[D],H=((L=F==null?void 0:F.tallOn)==null?void 0:L.includes(p.id))||q.length>400||q.split(`
`).length>6,K=(F==null?void 0:F.textMaxEm)||28,Y=a.filter(x=>{const w=n&&x.id===n.id,S=(x.level||"").toLowerCase().includes("одноуровнев");return!w&&!S}),u=p.emoji||(p.id==="1.11"?"♾️":"");return e.jsxs("div",{className:`badge-screen ${(I=p.id)!=null&&I.startsWith("1.4.")?"badge--group-1-4":""}`,children:[e.jsxs("div",{className:"header",children:[e.jsx("button",{onClick:fe,className:"back-button",children:"← Назад к категории"}),e.jsxs("div",{className:"badge-header",children:[e.jsx("div",{className:"badge-emoji-large",children:u}),e.jsxs("div",{children:[e.jsx("h1",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0,0,0,0.8)",fontWeight:"bold"},children:p.title}),e.jsx("p",{className:"badge-category",style:{color:"#FFA500",textShadow:"1px 1px 2px rgba(0,0,0,0.6)",fontWeight:"600"},children:r==null?void 0:r.title})]})]})]}),e.jsx("div",{className:"badge-content",children:e.jsxs("section",{className:"badge-summary",children:[e.jsxs("div",{className:`badge-summary__block ${H?"badge-summary__block--tall":""}`,style:H?{"--info-max-em":`${K}em`}:{},children:[e.jsx("h3",{children:"Общая информация"}),e.jsx("p",{className:"badge-summary__text",children:(()=>{const x=(n==null?void 0:n.description)||p.description||"Общая информация пока не найдена в данных. Содержание будет подгружено автоматически после обновления Путеводителя.",S=X(p.id)?te(x):x,{mainText:j,evidenceText:A}=G(S);return e.jsxs(e.Fragment,{children:[j,A&&e.jsxs(e.Fragment,{children:[e.jsx("br",{}),e.jsx("br",{}),e.jsx("span",{className:"badge-evidence",children:A})]})]})})()}),(n==null?void 0:n.nameExplanation)&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Объяснение названия"}),e.jsx("p",{className:"badge-summary__text",children:n.nameExplanation})]}),(n==null?void 0:n.skillTips)&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Как прокачать навык"}),e.jsx("p",{className:"badge-summary__text",children:n.skillTips})]}),(n==null?void 0:n.examples)&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Примеры"}),e.jsx("p",{className:"badge-summary__text",children:n.examples})]}),(n==null?void 0:n.importance)&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Почему этот значок важен"}),e.jsx("p",{className:"badge-summary__text",children:n.importance})]}),(n==null?void 0:n.philosophy)&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Философия значка"}),e.jsx("p",{className:"badge-summary__text",children:n.philosophy})]}),(n==null?void 0:n.howToBecome)&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Как стать"}),e.jsx("p",{className:"badge-summary__text",children:n.howToBecome})]}),e.jsxs("div",{className:"badge-meta",children:[e.jsxs("div",{children:[e.jsx("span",{children:"Категория"}),e.jsx("strong",{children:r==null?void 0:r.title})]}),e.jsxs("div",{children:[e.jsx("span",{children:"Всего уровней"}),e.jsx("strong",{children:a.length})]}),e.jsxs("div",{children:[e.jsx("span",{children:"ID"}),e.jsx("strong",{children:p.id})]})]})]}),e.jsxs("div",{className:"badge-summary__right",children:[e.jsxs("div",{className:"badge-summary__block",children:[e.jsx("h3",{children:l?"Как получить базовый уровень":"Как получить значок"}),M.length>0?e.jsx("ul",{className:"badge-steps__list",children:M.map((x,w)=>e.jsx("li",{children:x},w))}):e.jsx("p",{className:"badge-summary__text",children:"Критерии для базового уровня пока не определены."}),N&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Чем подтверждается"}),e.jsx("p",{className:"badge-summary__text badge-evidence",children:N})]})]}),Y.length>0&&e.jsx("div",{className:"levels-grid-bottom",children:Y.map(x=>e.jsxs("article",{className:"level-card-bottom",onClick:()=>ce(x.level),children:[e.jsx("div",{className:"level-card__icon",children:e.jsx("span",{className:"level-bubble__emoji",children:x.emoji||"🏆"})}),e.jsx("h4",{className:"level-card__title",children:x.title}),e.jsx("div",{className:"level-card__subtitle",children:x.level})]},x.id))})]})]})})]})},Ne=()=>{var K,Y;if(!p||!v)return null;const t=(p.id||"").split("."),l=t.length===3,m=l?t.slice(0,2).join(".")+".":p.id,a=h.find(u=>u.category_id!==p.category_id?!1:l?(u.id||"").startsWith(m)&&u.level===v:u.id===p.id&&u.level===v);if(!a)return null;const N=(u=>{if(!u.criteria)return["Выполнить все базовые требования значка.","Показать более глубокое понимание и навыки.","Демонстрировать постоянное развитие и улучшение."];const z=u.criteria.replace(/^Как получить значок «[^»]+»:\s*/,""),x=(X(u.id)?re(z):z).split("✅").filter(w=>w.trim()).map(w=>w.trim());return x.length>0?x:["Выполнить все базовые требования значка.","Показать более глубокое понимание и навыки.","Демонстрировать постоянное развитие и улучшение."]})(a),M=a.confirmation||null,y=()=>v==="Продвинутый уровень"||v==="Продвинутый уровень "?'url("./экран 5 фон.png")':v==="Экспертный уровень"?'url("./экран 6 фон.png")':'url("./экран 3 фон.png")',q=(K=a.id)==null?void 0:K.split(".").slice(0,2).join("."),D=ie[q],F=((Y=D==null?void 0:D.tallOn)==null?void 0:Y.includes(a.id))||a.id==="1.1.2"||a.id==="1.1.3"||a.id==="1.2.2"||a.id==="1.2.3"||a.id==="1.3.2"||a.id==="1.3.3"||a.id==="1.4.2",H=(D==null?void 0:D.textMaxEm)||28;return e.jsxs("div",{className:"badge-level-screen",style:{background:`
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            ${y()} center center / 100% no-repeat
          `},children:[e.jsxs("div",{className:"header",children:[e.jsx("button",{onClick:be,className:"back-button",children:"← Назад к значку"}),e.jsxs("div",{className:"level-header",children:[e.jsx("div",{className:"badge-emoji-large",children:a.emoji||"🏆"}),e.jsxs("div",{children:[e.jsx("h1",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0,0,0,0.8)",fontWeight:"bold"},children:a.title}),e.jsx("p",{className:"level-title",style:{color:"#FFA500",textShadow:"1px 1px 2px rgba(0,0,0,0.6)",fontWeight:"600"},children:v})]})]})]}),e.jsx("div",{className:"level-content",children:e.jsxs("section",{className:"badge-summary",children:[e.jsxs("div",{className:`badge-summary__block ${F?"badge-summary__block--tall":""}`,style:F?{"--info-max-em":`${H}em`}:{},children:[e.jsx("h3",{children:"Общая информация"}),e.jsx("p",{className:"badge-summary__text",children:(()=>{const u=p.description||a.description||"Общая информация пока не найдена в данных. Содержание будет подгружено автоматически после обновления Путеводителя.",L=X(a.id)?te(u):u,{mainText:I,evidenceText:x}=G(L);return e.jsxs(e.Fragment,{children:[I,x&&e.jsxs(e.Fragment,{children:[e.jsx("br",{}),e.jsx("br",{}),e.jsx("span",{className:"badge-evidence",children:x})]})]})})()}),a.nameExplanation&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Объяснение названия"}),e.jsx("p",{className:"badge-summary__text",children:a.nameExplanation})]}),a.skillTips&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Как прокачать навык"}),e.jsx("p",{className:"badge-summary__text",children:a.skillTips})]}),a.examples&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Примеры"}),e.jsx("p",{className:"badge-summary__text",children:a.examples})]}),a.importance&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Почему этот значок важен"}),e.jsx("p",{className:"badge-summary__text",children:a.importance})]}),a.philosophy&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Философия значка"}),e.jsx("p",{className:"badge-summary__text",children:a.philosophy})]}),a.howToBecome&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Как стать"}),e.jsx("p",{className:"badge-summary__text",children:a.howToBecome})]}),e.jsxs("div",{className:"badge-meta",children:[e.jsxs("div",{children:[e.jsx("span",{children:"Категория"}),e.jsx("strong",{children:r==null?void 0:r.title})]}),e.jsxs("div",{children:[e.jsx("span",{children:"Уровень"}),e.jsx("strong",{children:v})]}),e.jsxs("div",{children:[e.jsx("span",{children:"ID"}),e.jsx("strong",{children:a.id})]})]})]}),e.jsxs("div",{className:"badge-summary__block",children:[e.jsxs("h3",{children:["Как получить ",v.toLowerCase()]}),N.length>0?e.jsx("ul",{className:"badge-steps__list",children:N.map((u,z)=>{if(!u.includes("Например:"))return e.jsx("li",{children:u},z);const I=u.split("Например:"),x=I[0].trim(),S=I.slice(1).join("Например:").split(`
`).map(j=>j.trim()).filter(j=>j.length>0&&(j.startsWith("•")||j.startsWith("✅")||j.includes("Помочь")||j.includes("Проследить")));return e.jsxs("li",{children:[e.jsx("div",{className:"criterion-text",children:x}),S.length>0&&e.jsxs("div",{className:"criterion-examples",children:[e.jsx("p",{className:"criterion-example",children:"Например:"}),S.map((j,A)=>e.jsx("p",{className:"criterion-example",children:j},A))]})]},z)})}):e.jsxs("p",{className:"badge-summary__text",children:["Критерии для получения ",v.toLowerCase()," пока не определены. Обратитесь к вожатым для получения подробной информации."]}),M&&e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"Чем подтверждается"}),e.jsx("p",{className:"badge-summary__text badge-evidence",children:M})]})]})]})})]})};if(i)return e.jsx("div",{className:"loading-screen",children:e.jsxs("div",{className:"loading-content",children:[e.jsx("div",{className:"loading-spinner"}),e.jsx("p",{children:"Загрузка космической карты значков..."})]})});const J=t=>t.replace(/\s+/g," ").replace(/\n\s*\n\s*\n/g,`

`).replace(/^\s+|\s+$/gm,"").replace(/<p>\s*<\/p>/g,"").replace(/(<br\s*\/?>)\s*(<br\s*\/?>)/g,"<br>").replace(/>\s+</g,"><").replace(/\s{2,}/g," ").trim(),Fe=()=>{var l;if(!((l=r==null?void 0:r.introduction)!=null&&l.has_introduction))return null;const t=J(r.introduction.html);return e.jsxs("div",{className:"introduction-screen",children:[e.jsxs("div",{className:"header",children:[e.jsx("button",{onClick:je,className:"back-button",children:"← Назад к категории"}),e.jsxs("h1",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0,0,0,0.8)",fontWeight:"bold"},children:["💡 Подсказка: ",r.title]})]}),e.jsx("div",{className:"introduction-content",children:e.jsx("div",{className:"introduction-text",dangerouslySetInnerHTML:{__html:t}})})]})},ze=()=>e.jsxs("div",{className:"about-camp-screen",children:[e.jsxs("div",{className:"header",children:[e.jsx("button",{onClick:Z,className:"back-button",children:"← Назад к главной"}),e.jsx("h1",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0,0,0,0.8)",fontWeight:"bold"},children:"🌟 Реальный Лагерь"})]}),e.jsx("div",{className:"about-camp-content",children:e.jsxs("div",{className:"camp-description",children:[e.jsx("h2",{children:"🚀 Реальный Лагерь — развиваем навыки будущего!"}),e.jsxs("p",{children:["За смену подростки получают навыки и опыт, которые будут полезны далеко за пределами лагеря и школы:",e.jsx("strong",{children:"лидерство, креативность, коммуникативность, работа с ИИ и умение работать в команде."})]}),e.jsxs("p",{children:[e.jsx("strong",{children:"7 событий в день"})," — от создания музыки с нейросетями до организации собственных мероприятий и душевных вечеров с песнями под гитару и скрипку. Ваш ребёнок вернётся домой ",e.jsx("strong",{children:"с новым взглядом на себя и мир."})]}),e.jsx("h3",{children:"🎯 Что мы развиваем"}),e.jsxs("div",{className:"benefits-grid",children:[e.jsxs("div",{className:"benefit-item clickable",onClick:()=>{const t=g.find(l=>l.id==="13");t&&U(t)},children:[e.jsx("h4",{children:"🧩 Навыки 4K"}),e.jsxs("p",{children:["🎨 Креативность",e.jsx("br",{}),"💬 Коммуникация",e.jsx("br",{}),"🤝 Коллаборация",e.jsx("br",{}),"🧠 Критическое мышление"]})]}),e.jsxs("div",{className:"benefit-item clickable",style:{background:'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("./pictures/ии 2.png") center/cover no-repeat',cursor:"pointer"},onClick:()=>{const t=g.find(l=>l.id==="12");t&&U(t)},children:[e.jsx("h4",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0, 0, 0, 0.8)",fontWeight:"bold"},children:"✨Нейролагерь – нейросети для детей"}),e.jsx("p",{style:{color:"#fff",fontWeight:"600",textShadow:"1px 1px 2px rgba(0, 0, 0, 0.8)"},children:"Изучаем нейросети как инструмент для обучения, творчества, проектной деятельности, создания стратегий."})]}),e.jsxs("div",{className:"benefit-item clickable",style:{background:'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("./pictures/photo_2025-07-12_00-47-35.jpg") center 20% / 100% no-repeat',cursor:"pointer"},onClick:()=>{const t=g.find(l=>l.id==="9");t&&U(t)},children:[e.jsx("h4",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0, 0, 0, 0.8)",fontWeight:"bold"},children:"🔥 Соуправление и лидерские качества"}),e.jsx("p",{style:{color:"#fff",fontWeight:"600",textShadow:"1px 1px 2px rgba(0, 0, 0, 0.8)"},children:"Организация мероприятий, помощь другим, ответственность — качества настоящего лидера"})]})]}),e.jsx("h3",{children:"🔗 Полезные ссылки"}),e.jsxs("div",{className:"links-section",children:[e.jsx("a",{href:"https://realcampspb.ru",target:"_blank",rel:"noopener noreferrer",className:"camp-link",children:"🌐 Официальный сайт: realcampspb.ru"}),e.jsx("a",{href:"https://vk.com/realcampspb",target:"_blank",rel:"noopener noreferrer",className:"camp-link",children:"📱 ВКонтакте: vk.com/realcampspb (блог лагеря)"}),e.jsx("a",{href:"https://zen.yandex.ru/realcamp",target:"_blank",rel:"noopener noreferrer",className:"camp-link",children:"📝 Наш блог в Яндекс.Дзен: zen.yandex.ru/realcamp"}),e.jsx("a",{href:"https://www.coo-molod.ru/",target:"_blank",rel:"noopener noreferrer",className:"camp-link",children:"🏛️ Сертификаты: coo-molod.ru"})]}),e.jsx("h3",{children:"📸 Как это выглядит на практике"}),e.jsxs("div",{className:"posts-section",children:[e.jsxs("a",{href:"https://vk.com/wall-57701087_9100",target:"_blank",rel:"noopener noreferrer",className:"post-link",children:[e.jsx("div",{className:"post-image",children:e.jsx("img",{src:"./pictures/E83kZjD-R0X5rVyIWh-4g2ZfX0uUWj2KPEW37uF73N1elgXzbdeCy46vJzdQICJ-6FNviwvlOplHPs_8_fZpvM_F.jpg",alt:"Пост 1"})}),e.jsxs("div",{className:"post-title",children:[e.jsx("div",{className:"post-main-title",children:"🔥 Вожатские кейсы и педагогика"}),e.jsx("div",{className:"post-subtitle",children:"Разбор сложных ситуаций: от ночных посиделок до буллинга"}),e.jsxs("div",{className:"post-highlights",children:[e.jsx("span",{className:"highlight",children:"💡 Практические навыки"}),e.jsx("span",{className:"highlight",children:"🎭 Ролевые игры"}),e.jsx("span",{className:"highlight",children:'🚀 Значок "Реальный Фасилитатор"'})]})]})]}),e.jsxs("a",{href:"https://vk.com/wall-57701087_9080",target:"_blank",rel:"noopener noreferrer",className:"post-link",children:[e.jsx("div",{className:"post-image",children:e.jsx("img",{src:"./pictures/HvRgNN4EUqGaVKKmQYwOnSESzm3zhN8NLN7psGe2xTbuscFg5h0oIIxbtlYIkCIO1zj2TUQYoFAKy9pYquEpfGrR.jpg",alt:"Пост 2"})}),e.jsxs("div",{className:"post-title",children:[e.jsx("div",{className:"post-main-title",children:"🚀 Дети сами организуют отрядные дела!"}),e.jsx("div",{className:"post-subtitle",children:'Игра "Бросвящение": от кинематографа до оригами'}),e.jsxs("div",{className:"post-highlights",children:[e.jsx("span",{className:"highlight",children:"🎬 Игра по станциям"}),e.jsx("span",{className:"highlight",children:"🎨 Мастер-классы"}),e.jsx("span",{className:"highlight",children:"🔥 Лидерство"})]})]})]}),e.jsxs("a",{href:"https://vk.com/wall-57701087_9072",target:"_blank",rel:"noopener noreferrer",className:"post-link",children:[e.jsx("div",{className:"post-image",children:e.jsx("img",{src:"./pictures/sZn6aZO0WMdSNnL0qvBUsUlMoYySzf5-3eYIv4wnvUfLEkBUKk3qtRwlwPVcHa7dGxIs1_VgNVjFnriMepAkmQTh.jpg",alt:"Пост 3"})}),e.jsxs("div",{className:"post-title",children:[e.jsx("div",{className:"post-main-title",children:"🎨 Нейродизайн и агентные системы"}),e.jsx("div",{className:"post-subtitle",children:"От идеи до реального значка: Genspark, FLUX, ChatGPT"}),e.jsxs("div",{className:"post-highlights",children:[e.jsx("span",{className:"highlight",children:"🤖 Итерационный подход"}),e.jsx("span",{className:"highlight",children:"🎯 Реальные продукты"}),e.jsx("span",{className:"highlight",children:"🧠 Метапромтинг"})]})]})]}),e.jsxs("a",{href:"https://vk.com/wall-57701087_9049",target:"_blank",rel:"noopener noreferrer",className:"post-link",children:[e.jsx("div",{className:"post-image",children:e.jsx("img",{src:"./pictures/2025-09-05_23-59-25.png",alt:"Пост 4"})}),e.jsxs("div",{className:"post-title",children:[e.jsx("div",{className:"post-main-title",children:"🏴‍☠️ Пираты похитили Бурыча!"}),e.jsx("div",{className:"post-subtitle",children:"Форт Боярд в лагере: эстафеты, головоломки, спасение"}),e.jsxs("div",{className:"post-highlights",children:[e.jsx("span",{className:"highlight",children:"⚔️ Командные испытания"}),e.jsx("span",{className:"highlight",children:"🧩 Головоломки"}),e.jsx("span",{className:"highlight",children:"🎯 Форт Боярд"})]})]})]}),e.jsxs("a",{href:"https://vk.com/wall-57701087_9009",target:"_blank",rel:"noopener noreferrer",className:"post-link",children:[e.jsx("div",{className:"post-image",children:e.jsx("img",{src:"./pictures/4pCDWvEw_uyf3q8yQbhfsPpfDSVOMYkkexIZCudbxTsmqN8iA3jIT8TwpNtXbGliD_YCpD2nZhQZXajz4-0KFg-1.jpg",alt:"Пост 5"})}),e.jsxs("div",{className:"post-title",children:[e.jsx("div",{className:"post-main-title",children:"🎶 Музыкальный продюсер с Suno AI"}),e.jsx("div",{className:"post-subtitle",children:"От текста до готового трека: творчество без границ"}),e.jsxs("div",{className:"post-highlights",children:[e.jsx("span",{className:"highlight",children:"🎹 Создание треков"}),e.jsx("span",{className:"highlight",children:"🎤 Запись голоса"}),e.jsx("span",{className:"highlight",children:'🎵 Значок "AI-Композитор"'})]})]})]}),e.jsxs("a",{href:"https://vk.com/wall-57701087_9006",target:"_blank",rel:"noopener noreferrer",className:"post-link",children:[e.jsx("div",{className:"post-image",children:e.jsx("img",{src:"./pictures/7zwq9TM56YIgLvgyfgG1FJUm0lRtQ2-1TTi5EIEwubGUDg7_u77CYs5eMnz5CJ1v9zNTvoP49-UlGtYArl_fERQ7.jpg",alt:"Пост 6"})}),e.jsxs("div",{className:"post-title",children:[e.jsx("div",{className:"post-main-title",children:"🥊 Мастер-класс по самообороне"}),e.jsx("div",{className:"post-subtitle",children:"С Тимофеем: ценные уроки и невероятная атмосфера"}),e.jsxs("div",{className:"post-highlights",children:[e.jsx("span",{className:"highlight",children:"🥊 Самооборона"}),e.jsx("span",{className:"highlight",children:"🌟 Мастерство"}),e.jsx("span",{className:"highlight",children:"🙌 Ценные уроки"})]})]})]}),e.jsxs("a",{href:"https://vk.com/wall-57701087_8995",target:"_blank",rel:"noopener noreferrer",className:"post-link",children:[e.jsx("div",{className:"post-image",children:e.jsx("img",{src:"./pictures/2025-09-06_00-12-54.png",alt:"Пост 7"})}),e.jsxs("div",{className:"post-title",children:[e.jsx("div",{className:"post-main-title",children:"🕯️ Огонёк откровений"}),e.jsx("div",{className:"post-subtitle",children:"Безопасное пространство для открытого общения"}),e.jsxs("div",{className:"post-highlights",children:[e.jsx("span",{className:"highlight",children:"🫂 Принятие"}),e.jsx("span",{className:"highlight",children:"🎯 Доверие"}),e.jsx("span",{className:"highlight",children:"🏡 Семейные отношения"})]})]})]}),e.jsxs("a",{href:"https://vk.com/wall-57701087_8994",target:"_blank",rel:"noopener noreferrer",className:"post-link",children:[e.jsx("div",{className:"post-image",children:e.jsx("img",{src:"./pictures/s2h4cMVKTb8nvRA56BUTpjsa16sTjMNfenMAdMBdQbPJWWJwSGooE5u1D8b-0hQ0IQNp59LW4IsDHse46SZavWEA.jpg",alt:"Пост 8"})}),e.jsxs("div",{className:"post-title",children:[e.jsx("div",{className:"post-main-title",children:"🚀 EggX: лётно-конструкторские испытания"}),e.jsx("div",{className:"post-subtitle",children:"Инженерный челлендж: яйцелёты с высоты 3 метров"}),e.jsxs("div",{className:"post-highlights",children:[e.jsx("span",{className:"highlight",children:"🧪 Конструкторские бюро"}),e.jsx("span",{className:"highlight",children:"🔬 Техническая смекалка"}),e.jsx("span",{className:"highlight",children:"👨‍🚀 Командная работа"})]})]})]}),e.jsxs("a",{href:"https://vk.com/wall-57701087_8927",target:"_blank",rel:"noopener noreferrer",className:"post-link",children:[e.jsx("div",{className:"post-image",children:e.jsx("img",{src:"./pictures/2025-09-06_00-16-20.png",alt:"Пост 9"})}),e.jsxs("div",{className:"post-title",children:[e.jsx("div",{className:"post-main-title",children:"😎 Сигма-Бро в Реальном Лагере"}),e.jsx("div",{className:"post-subtitle",children:"Лето, Soft Skills, нейросети и добро круглый год"}),e.jsxs("div",{className:"post-highlights",children:[e.jsx("span",{className:"highlight",children:"☀️ Родительский час"}),e.jsx("span",{className:"highlight",children:"💜 Атмосфера"}),e.jsx("span",{className:"highlight",children:"🌟 Воспоминания"})]})]})]})]}),e.jsx("h3",{children:"📅 ОСЕННЯЯ СМЕНА 2025"}),e.jsxs("div",{className:"session-info clickable",onClick:ge,style:{cursor:"pointer"},children:[e.jsx("h4",{children:'🎪 "Осенний 4К-вайб в Реальном Лагере: навыки будущего + нейросети для обучения и творчества"'}),e.jsxs("p",{children:[e.jsx("strong",{children:"Когда:"})," с 25 октября по 2 ноября 2025 года"]}),e.jsx("p",{children:e.jsx("strong",{children:"Стоимость:"})}),e.jsxs("ul",{children:[e.jsx("li",{children:"30 500 ₽ — со скидкой по сертификату СПб"}),e.jsx("li",{children:"35 500 ₽ — полная стоимость"})]}),e.jsx("p",{children:e.jsx("em",{children:"Читайте отзывы родителей в нашей группе ВКонтакте!"})})]})]})})]}),Se=()=>{if(!$)return null;const t=J($.content);return e.jsxs("div",{className:"additional-material-screen",children:[e.jsxs("div",{className:"header",children:[e.jsx("button",{onClick:ve,className:"back-button",children:"← Назад к категории"}),e.jsx("h1",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0,0,0,0.8)",fontWeight:"bold"},children:$.title})]}),e.jsx("div",{className:"additional-material-content",children:e.jsx("div",{className:"additional-material-text",dangerouslySetInnerHTML:{__html:t}})})]})},Te=()=>e.jsxs("div",{className:"registration-form-screen",children:[e.jsxs("div",{className:"header",children:[e.jsx("button",{onClick:me,className:"back-button",children:"← Назад"}),e.jsx("h1",{style:{color:"#FFD700",textShadow:"2px 2px 4px rgba(0,0,0,0.8)",fontWeight:"bold"},children:"🎪 Запись на осеннюю смену"})]}),e.jsx("div",{className:"registration-form-content",children:e.jsxs("div",{className:"form-container",children:[e.jsx("h2",{children:"📝 Заполните форму для записи"}),e.jsx("p",{children:"Мы свяжемся с вами в течение дня для подтверждения записи"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"👶 Имя ребёнка *"}),e.jsx("input",{type:"text",value:b.childName,onChange:t=>O("childName",t.target.value),placeholder:"Введите имя ребёнка",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"👨‍👩‍👧‍👦 Имя родителя *"}),e.jsx("input",{type:"text",value:b.parentName,onChange:t=>O("parentName",t.target.value),placeholder:"Введите ваше имя",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"📞 Телефон *"}),e.jsx("input",{type:"tel",value:b.phone,onChange:t=>O("phone",t.target.value),placeholder:"+7 (999) 123-45-67",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"📧 Email"}),e.jsx("input",{type:"email",value:b.email,onChange:t=>O("email",t.target.value),placeholder:"your@email.com"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"🎂 Возраст ребёнка *"}),e.jsx("input",{type:"number",value:b.childAge,onChange:t=>O("childAge",t.target.value),placeholder:"8",min:"6",max:"17",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"💭 Особые пожелания"}),e.jsx("textarea",{value:b.specialRequests,onChange:t=>O("specialRequests",t.target.value),placeholder:"Аллергии, особенности питания, медицинские показания...",rows:3})]}),e.jsx("button",{className:"submit-button",onClick:xe,disabled:!b.childName||!b.parentName||!b.phone||!b.childAge,children:"🚀 Отправить заявку в Telegram"})]})})]});return e.jsxs("div",{className:"app",children:[c==="intro"&&ye(),c==="categories"&&_e(),c==="category"&&we(),c==="badge"&&ke(),c==="badge-level"&&Ne(),c==="introduction"&&Fe(),c==="additional-material"&&Se(),c==="about-camp"&&ze(),c==="registration-form"&&Te(),e.jsx(Le,{onClick:()=>E(!C),isOpen:C}),e.jsx(Oe,{isOpen:C,onClose:()=>E(!1),currentView:c,currentCategory:r?{id:r.id,title:r.title,emoji:r.emoji}:void 0,currentBadge:p?{id:p.id,title:p.title,emoji:p.emoji,categoryId:p.category_id}:void 0}),e.jsx("style",{children:`
        .app {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          font-family: 'Arial', sans-serif;
          color: white;
          background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
        }

        /* Global scrollbar styling (WebKit) */
        *::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        *::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 8px;
        }
        *::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(78,205,196,0.9), rgba(46,134,222,0.9));
          border-radius: 8px;
          border: 2px solid rgba(0, 0, 0, 0.3);
        }
        *::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(78,205,196,1), rgba(46,134,222,1));
        }

        /* Firefox */
        * {
          scrollbar-width: thin;               /* auto | thin | none */
          scrollbar-color: rgba(78,205,196,0.9) rgba(255,255,255,0.06);
        }

        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .loading-content {
          text-align: center;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #4ecdc4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

                 .intro-screen {
           position: absolute;
           top: 0;
           left: 0;
           width: 100%;
           height: 100%;
           display: flex;
           justify-content: center;
           align-items: center;
           background: 
             linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('./экран 1 фон copy.png') center top / 100% 100% no-repeat;
           backdrop-filter: blur(10px);
         }

        .intro-logo {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: all 0.3s ease;
        }

        .intro-logo img {
          width: 180px;
          height: 180px;
          object-fit: cover;
          object-position: center;
          border-radius: 18px;
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.4),
            0 0 0 2px rgba(255, 215, 0, 1),
            0 0 20px rgba(255, 215, 0, 0.5),
            0 0 40px rgba(255, 215, 0, 0.3),
            inset 0 0 0 1px rgba(255, 255, 0, 0.8),
            inset 0 0 20px rgba(255, 215, 0, 0.4),
            inset 0 0 40px rgba(255, 215, 0, 0.2);
          background: rgba(255, 255, 255, 0.1);
          padding: 0px;
          transition: all 0.3s ease;
        }

        .intro-logo:hover {
          transform: scale(1.02);
        }

        .intro-logo:hover img {
          box-shadow: 
            0 12px 32px rgba(0, 0, 0, 0.5),
            0 0 0 3px rgba(255, 215, 0, 1),
            0 0 30px rgba(255, 215, 0, 0.8),
            0 0 60px rgba(255, 215, 0, 0.6),
            0 0 100px rgba(255, 215, 0, 0.4),
            inset 0 0 0 2px rgba(255, 255, 0, 1),
            inset 0 0 30px rgba(255, 215, 0, 0.6),
            inset 0 0 60px rgba(255, 215, 0, 0.3);
        }

        .logo-hover-text {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%);
          color: #FFD700;
          font-size: 14px;
          font-weight: bold;
          text-shadow: 
            0 0 10px rgba(255, 215, 0, 0.8),
            0 0 20px rgba(255, 215, 0, 0.6),
            0 0 30px rgba(255, 215, 0, 0.4);
          opacity: 0;
          transition: all 0.3s ease;
          white-space: nowrap;
          letter-spacing: 1px;
        }

        .intro-logo:hover .logo-hover-text {
          opacity: 1;
          transform: translateX(-50%) translateY(-5px);
        }

        .about-camp-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('./экран 1 фон copy.png') center top / 100% 100% no-repeat;
          backdrop-filter: blur(10px);
          overflow-y: auto;
        }

        .about-camp-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 20px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(4px);
        }

        .camp-description h2 {
          color: #FFD700;
          font-size: 1.8rem;
          margin-bottom: 1rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }

        .camp-description h3 {
          color: #FFA500;
          font-size: 1.4rem;
          margin: 1.5rem 0 1rem 0;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .camp-description p {
          color: #E6F7FF;
          line-height: 1.6;
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        .camp-description ul {
          color: #E6F7FF;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }

        .camp-description li {
          margin-bottom: 0.5rem;
        }

        .links-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .camp-link {
          color: #4ECDC4;
          text-decoration: none;
          padding: 0.8rem 1.2rem;
          background: rgba(78, 205, 196, 0.1);
          border: 1px solid rgba(78, 205, 196, 0.3);
          border-radius: 10px;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .camp-link:hover {
          background: rgba(78, 205, 196, 0.2);
          border-color: rgba(78, 205, 196, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
        }

        .session-info {
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 15px;
          padding: 1.5rem;
          margin-top: 1rem;
        }

        .session-info h4 {
          color: #FFD700;
          font-size: 1.2rem;
          margin-bottom: 1rem;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .session-info p {
          margin-bottom: 0.8rem;
        }

        .session-info ul {
          margin: 0.5rem 0 1rem 1.5rem;
        }

        .session-info li {
          margin-bottom: 0.3rem;
        }

        .posts-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .post-link {
          color: #FFA500;
          text-decoration: none;
          padding: 1rem;
          background: rgba(255, 165, 0, 0.1);
          border: 1px solid rgba(255, 165, 0, 0.3);
          border-radius: 10px;
          transition: all 0.3s ease;
          font-weight: 500;
          text-align: center;
          display: block;
        }

        .post-link:hover {
          background: rgba(255, 165, 0, 0.2);
          border-color: rgba(255, 165, 0, 0.5);
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(255, 165, 0, 0.3);
        }

        .post-image {
          width: 100%;
          height: 150px;
          overflow: hidden;
          border-radius: 8px;
          margin-bottom: 0.8rem;
        }

        .post-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform 0.3s ease;
        }

        .post-link:hover .post-image img {
          transform: scale(1.05);
        }

        /* Benefits Grid */
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .benefit-item {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
          border: 2px solid rgba(255, 215, 0, 0.3);
          border-radius: 15px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .benefit-item:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(255, 215, 0, 0.2);
          border-color: rgba(255, 215, 0, 0.6);
        }

        .benefit-item.clickable {
          cursor: pointer;
          position: relative;
          overflow: hidden;
          background: 
            linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
            url('./pictures/софт скиллз.png') center/cover no-repeat;
        }

        .benefit-item.clickable::after {
          content: '👆';
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 16px;
          opacity: 0.7;
          transition: all 0.3s ease;
        }

        .benefit-item.clickable:hover::after {
          opacity: 1;
          transform: scale(1.2);
        }

        .benefit-item.clickable:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 15px 35px rgba(255, 215, 0, 0.3);
          border-color: rgba(255, 215, 0, 0.8);
        }

        .benefit-item h4 {
          color: #FFD700;
          margin-bottom: 10px;
          font-size: 18px;
        }

        .benefit-item.clickable h4 {
          color: #FFD700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-weight: bold;
        }

        .benefit-item p {
          color: #333;
          font-size: 14px;
          line-height: 1.4;
        }

        .benefit-item.clickable p {
          color: #fff;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        /* Daily Activities */
        .daily-activities {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }

        .activity-item {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .activity-item:hover {
          transform: translateX(5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .activity-icon {
          font-size: 32px;
          margin-right: 15px;
          min-width: 40px;
        }

        .activity-item div {
          flex: 1;
        }

        .activity-item strong {
          color: #2c3e50;
          font-size: 16px;
          display: block;
          margin-bottom: 5px;
        }

        .activity-item p {
          color: #666;
          font-size: 13px;
          margin: 0;
          line-height: 1.3;
        }

        /* CTA Section */
        .cta-section {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.15) 100%);
          border: 3px solid rgba(255, 215, 0, 0.4);
          border-radius: 20px;
          padding: 25px;
          text-align: center;
          margin: 30px 0;
          box-shadow: 0 8px 25px rgba(255, 215, 0, 0.2);
        }

        .cta-section h3 {
          color: #FFD700;
          font-size: 24px;
          margin-bottom: 15px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .cta-section p {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 10px;
        }

        .cta-section p:last-child {
          margin-bottom: 0;
          font-size: 14px;
          color: #e74c3c;
          font-weight: bold;
        }

        .post-link:nth-child(3) .post-image img {
          object-position: center 20%;
        }

        .post-title {
          font-size: 0.9rem;
          line-height: 1.3;
        }

        .post-main-title {
          font-size: 1rem;
          font-weight: bold;
          color: #FFD700;
          margin-bottom: 0.3rem;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .post-subtitle {
          font-size: 0.8rem;
          color: #E6F7FF;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .post-highlights {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          justify-content: center;
        }

        .highlight {
          font-size: 0.7rem;
          background: rgba(78, 205, 196, 0.2);
          color: #4ECDC4;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          border: 1px solid rgba(78, 205, 196, 0.3);
        }



                                                                       .intro-content {
             text-align: center;
             max-width: 1000px;
             padding: 1rem;
             background: rgba(0, 0, 0, 0.3);
             border-radius: 20px;
             border: 1px solid rgba(255, 255, 255, 0.1);
             box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
             margin: 1rem;
             backdrop-filter: blur(4px);
           }

                 .intro-content h1 {
           font-size: 2rem;
           margin-bottom: 18px;
           font-weight: 800;
           letter-spacing: -0.01em;
           background: linear-gradient(45deg, #4ecdc4, #44a08d);
           -webkit-background-clip: text;
           -webkit-text-fill-color: transparent;
           background-clip: text;
         }

                 .intro-content p {
           font-size: 0.9rem;
           line-height: 1.45;
           margin-bottom: 0.6rem;
           color: #E6F7FF;
           max-width: 70ch;
           margin-left: auto;
           margin-right: auto;
         }

                                                                       .philosophy-section {
             margin: 1rem 0;
             padding: 0.6rem;
             background: rgba(255, 255, 255, 0.03);
             border: 1px solid rgba(255, 255, 255, 0.05);
             border-radius: 15px;
             backdrop-filter: blur(2px);
             gap: 16px;
           }

                 .philosophy-main {
           font-size: 1rem !important;
           color: #CFEAF5 !important;
           text-align: center;
           margin-bottom: 0.6rem !important;
         }

                 .philosophy-points {
           margin: 0.6rem 0;
         }

                                                                       .point {
             display: grid;
             grid-template-columns: auto 1fr;
             gap: 12px;
             align-items: flex-start;
             margin-bottom: 0.6rem;
             padding: 0.5rem;
             background: rgba(255, 255, 255, 0.02);
             border-radius: 10px;
             border-left: 3px solid #62FFD0;
           }

                 .point-icon {
           font-size: 1.1rem;
           grid-column: 1;
           align-self: start;
         }

        .point div {
          grid-column: 2;
        }

                 .point strong {
           color: #62FFD0;
           display: block;
           margin-bottom: 0.2rem;
         }

                                                                       .philosophy-ending {
             text-align: center;
             font-size: 0.9rem !important;
             color: #62FFD0 !important;
             margin-top: 0.6rem !important;
             padding: 0.5rem;
             background: rgba(98, 255, 208, 0.05);
             border-radius: 10px;
           }

                 .start-instruction {
           text-align: center;
           font-size: 0.9rem;
           color: #ccc;
           margin: 0.6rem 0;
         }

                 .start-button {
           background: linear-gradient(45deg, #4ecdc4, #44a08d);
           border: none;
           padding: 0.6rem 1.2rem;
           font-size: 0.95rem;
           color: white;
           border-radius: 50px;
           cursor: pointer;
           transition: all 0.3s ease;
           box-shadow: 0 10px 20px rgba(78, 205, 196, 0.3);
           margin-top: 0.2rem;
         }

        .start-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(78, 205, 196, 0.4);
        }

                                   .categories-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            padding: 1rem;
            background: 
              linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
                             url('./экран 2 фон.png') center center / cover no-repeat;
          }

                   .category-screen,
          .badge-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 1rem;
            background: 
              linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
                             url('./экран 3 фон.png') center top / cover no-repeat;
          }

          .badge-level-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 1rem;
          }

                                   .header {
            margin-bottom: 0.4rem; /* Уменьшили отступ снизу */
            background: 
              linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
              url('./pictures/паттерн стикеры — копия (2).jpg') center center / 100% no-repeat;
            padding: 0.3rem; /* Уменьшили padding */
            border-radius: 15px;
            backdrop-filter: blur(5px);
          }

          .category-screen .header {
            background: 
              linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
              url('./pictures/паттерн значки.jpg') center 71% / 100% no-repeat !important;
            position: relative;
          }

          .category-screen .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
              radial-gradient(circle at 15% 25%, rgba(0, 0, 0, 0.4) 0%, transparent 30%),
              radial-gradient(circle at 85% 15%, rgba(0, 0, 0, 0.3) 0%, transparent 25%),
              radial-gradient(circle at 25% 75%, rgba(0, 0, 0, 0.35) 0%, transparent 35%),
              radial-gradient(circle at 75% 85%, rgba(0, 0, 0, 0.3) 0%, transparent 30%),
              radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.2) 0%, transparent 40%);
            filter: hue-rotate(270deg) saturate(1.5) brightness(0.8);
            pointer-events: none;
            z-index: 1;
          }

          .category-screen .header > * {
            position: relative;
            z-index: 2;
          }

                 .back-button {
           background: rgba(255, 255, 255, 0.1);
           border: 1px solid rgba(255, 255, 255, 0.2);
           color: white;
           padding: 0.4rem 0.8rem;
           border-radius: 25px;
           cursor: pointer;
           transition: all 0.3s ease;
           margin-bottom: 0.8rem;
           font-size: 0.9rem;
         }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

                                   .header h1 {
            color: #4ecdc4;
            font-size: 1.1rem; /* Уменьшили размер заголовка */
            margin: 0 0 0.1rem 0; /* Уменьшили отступ */
            white-space: pre-line !important;
          }

                  .header p {
            color: #ccc;
            font-size: 0.7rem; /* Уменьшили размер текста */
            margin: 0;
          }

                                                                                                                                                                               .categories-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                width: 100%;
                height: calc(100vh - 120px);
                padding: 1rem;
                overflow: hidden;
              }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               .category-container {
                   display: flex;
                   align-items: center;
                   gap: 0;
                   cursor: pointer;
                   padding: 0;
                   background: transparent;
                   border: none;
                   border-radius: 0;
                   backdrop-filter: none;
                   transition: all 0.3s ease;
                 }

                                                                                                                                                                               .category-card {
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                padding: 0.5rem;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                text-align: center;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
                aspect-ratio: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                min-width: 60px;
                min-height: 60px;
                overflow: hidden;
                flex-shrink: 0;
              }

                                       .category-container.floating {
             animation: float 6s ease-in-out infinite;
           }
 
           @keyframes float {
             0%, 100% {
               transform: translateY(0px);
             }
             50% {
               transform: translateY(-8px);
             }
           }

         .category-card::before {
           content: '';
           position: absolute;
           top: 50%;
           left: 50%;
           width: 80%;
           height: 80%;
           border: 1px solid rgba(78, 205, 196, 0.3);
           border-radius: 50%;
           transform: translate(-50%, -50%);
           pointer-events: none;
           animation: pulse 3s ease-in-out infinite;
         }

         @keyframes pulse {
           0%, 100% { 
             transform: translate(-50%, -50%) scale(1);
             opacity: 0.3;
           }
           50% { 
             transform: translate(-50%, -50%) scale(1.1);
             opacity: 0.6;
           }
         }

                                   .category-container:hover .category-card {
            transform: translateY(-5px) scale(1.05);
            box-shadow: none;
            border-color: #4ecdc4;
          }

          .category-container:hover .category-card::before {
            border-color: rgba(78, 205, 196, 0.8);
            animation-duration: 1s;
          }

          .category-container:hover .category-text h3 {
            color: #4ecdc4;
          }

                                                                                                                                                                                                                       .category-icon {
              font-size: clamp(1rem, 2vw, 2rem);
              flex-shrink: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              height: 100%;
            }
            
            .category-icon img {
              width: 118%;
              height: 118%;
              object-fit: cover;
              object-position: center;
            }

            .category-2-icon {
              width: 140% !important;
              height: 140% !important;
            }

            .category-5-icon {
              width: 138% !important;
              height: 138% !important;
            }

            .category-8-icon {
              width: 138% !important;
              height: 138% !important;
            }

            .category-9-icon {
              width: 145% !important;
              height: 145% !important;
            }

            .category-14-icon {
              width: 138% !important;
              height: 138% !important;
            }

                .category-13-icon {
      width: 138% !important;
      height: 138% !important;
    }

    .category-11-icon {
      width: 160% !important;
      height: 160% !important;
    }

    .category-3-icon {
      width: 200% !important;
      height: 200% !important;
    }

    .category-4-icon {
      width: 140% !important;
      height: 140% !important;
    }

    .category-7-icon {
      width: 140% !important;
      height: 140% !important;
    }

    .category-6-icon {
      width: 140% !important;
      height: 140% !important;
    }

    .category-10-icon {
      width: 160% !important;
      height: 160% !important;
            }

                     .category-text {
             display: flex;
             flex-direction: column;
             gap: 0.1rem; /* Уменьшили отступ между элементами */
             min-width: 0;
             flex: 1;
           }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       .category-text h3 {
                      margin: 0;
                      color: #4ecdc4;
                      font-size: clamp(0.6rem, 1.5vw, 0.9rem);
                      line-height: 1.2;
                      word-wrap: break-word;
                      text-align: left;
                      max-width: 500px;
                    }

                                                                                       .category-text p {
               margin: 0;
               color: #ccc;
               font-size: clamp(0.4rem, 1vw, 0.6rem);
               text-align: left;
               margin-top: 0.05rem;
             }

                                     .badges-grid {
             display: grid;
             grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
             gap: 18px;
             align-items: start;
             justify-content: center;
             overflow-x: hidden;
             box-sizing: border-box;
             padding: 16px;
             width: 100%;
             height: auto;
             min-height: calc(100vh - 120px);
             overflow-y: visible;
             max-width: 1400px;
             margin: 0 auto;
           }

                                     .badge-card {
             display: flex;
             flex-direction: column;
             align-items: center;
             justify-content: space-between;
             padding: 0;
             border-radius: 0;
             background: transparent;
             backdrop-filter: none;
             box-shadow: none;
             min-height: auto;
             height: auto;
             cursor: pointer;
             transition: all 0.3s ease;
             box-sizing: border-box;
           }

        .badge-card:hover {
          transform: translateY(-5px);
          box-shadow: none;
        }

                                     .badge-card__icon {
             width: 80px;
             height: 80px;
             border-radius: 50%;
             display: grid;
             place-items: center;
             flex: 0 0 auto;
             background: rgba(0, 0, 0, 0.4);
             border: 1px solid rgba(255, 255, 255, 0.2);
             transition: all 0.3s ease;
           }

                  .badge-card:hover .badge-card__icon {
            background: rgba(255, 255, 255, 0.1);
            border-color: #4ecdc4;
            box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
            transform: scale(1.1);
          }

                                     .badge-card__title {
             margin-top: 16px;
             text-align: center;
             font-size: 15px;
             line-height: 1.2;
             max-width: 100%;
             white-space: pre-line !important;
             word-break: break-word;
             hyphens: auto;
             color: #4ecdc4;
             margin: 0;
           }

                                     .badge-card__level {
             margin-top: 12px;
             font-size: 13px;
             color: #ccc;
             opacity: 0.8;
             text-align: center;
           }

                                     .badge-emoji {
             font-size: 3.5rem;
             transition: all 0.3s ease;
           }

                  .badge-card:hover .badge-emoji {
            transform: scale(1.2);
            filter: drop-shadow(0 0 10px rgba(78, 205, 196, 0.5));
          }

                                     @media (min-width: 576px) {
             .badges-grid { 
               grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
               max-width: 1200px;
             }
           }
           @media (min-width: 768px) {
             .badges-grid { 
               grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
               max-width: 1300px;
             }
           }
           @media (min-width: 1200px) {
             .badges-grid { 
               grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
               max-width: 1400px;
             }
           }



                                   .badge-card h3 {
            margin: 0 0 0.2rem 0;
            color: #4ecdc4;
            font-size: clamp(0.6rem, 1.5vw, 0.9rem);
            line-height: 1.2;
            word-wrap: break-word;
          }

                                   .badge-level {
            margin: 0;
            color: #ccc;
            font-size: clamp(0.4rem, 1vw, 0.6rem);
            margin-top: 0.05rem;
          }

        .badge-header,
        .level-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .badge-emoji-large {
          font-size: 4rem;
        }

        .badge-category,
        .level-title {
          color: #4ecdc4;
          font-size: 1.1rem;
          margin: 0;
        }

        .badge-content,
        .level-content {
          margin-top: 1rem;
        }

        .badge-summary {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.8rem;
        }
        @media (min-width: 992px) {
          .badge-summary {
            grid-template-columns: 1.2fr 0.8fr;
            align-items: start;
          }
        }

        .badge-summary__block {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.8rem;
          height: auto;
          min-height: fit-content;
        }
        .badge-summary__block--tall {
          min-height: 460px;
        }
        .badge-summary__right { 
          display: grid; 
          gap: 0.8rem; 
          align-items: start;
          height: auto;
          min-height: 100%;
          overflow: visible;
        }

        .badge-summary__text {
          color: #ddd;
          margin: 0.2rem 0 0.6rem 0;
          line-height: 1.6;
          white-space: pre-line;
          max-height: none;
          overflow: visible;
        }

        .badge-summary__block h4 {
          font-size: 18px;
          font-weight: 600;
          color: #4ecdc4;
          margin: 24px 0 12px 0;
          padding: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 8px;
        }

        .badge-evidence {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          color: #9ec;
          font-style: italic;
        }

        .criterion-text {
          margin-bottom: 8px;
        }

        .criterion-examples {
          margin-top: 8px;
          padding-left: 16px;
        }

        .criterion-example {
          margin: 4px 0;
          font-size: 0.95em;
          opacity: 0.9;
        }
        .badge-summary__block--tall .badge-summary__text {
          max-height: var(--info-max-em, 28em);
        }
        .badge-summary__block--tall-override .badge-summary__text {
          max-height: 32em;
        }

        .badge-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 0.6rem;
        }
        .badge-meta div {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .badge-meta div + div { margin-left: 10px; }
        .badge-meta div span { margin-right: 8px; }
        .badge-meta span { color: #9ec; }
        .badge-meta strong { color: #fff; font-weight: 600; }

        .badge-description,
        .level-description,
        .level-criteria {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .badge-description h3,
        .level-description h3,
        .level-criteria h3 {
          color: #4ecdc4;
          margin: 0 0 1rem 0;
        }

        .badge-description p,
        .level-description p,
        .level-criteria p {
          color: #ccc;
          line-height: 1.6;
          margin: 0;
        }

        .badge-levels h3 {
          color: #4ecdc4;
          margin: 0 0 1rem 0;
        }

        .levels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        /* Компактная сетка карточек уровней, идентичная стилю базовых значков */
        .levels-grid-compact {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          align-items: start;
        }
        .level-compact {
          min-height: 120px;
        }
        .levels-grid-compact .badge-card__title {
          display: block;
          -webkit-line-clamp: initial;
          -webkit-box-orient: initial;
          white-space: normal;
          overflow: visible;
          font-size: 13px;
        }

        .level-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .level-card__head { display: flex; align-items: center; gap: 0.6rem; }
        .level-card__emoji { font-size: 1.4rem; }
        .level-card__criteria { color: #ccc; margin: 0.4rem 0 0.2rem 0; white-space: pre-line; max-height: 10em; overflow: hidden; }
        .level-card__desc { color: #bbb; margin: 0; }
        .level-card__btn {
          margin-top: 0.8rem;
          background: rgba(78, 205, 196, 0.2);
          color: #4ecdc4;
          border: 1px solid rgba(78, 205, 196, 0.6);
          border-radius: 8px;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
        }
        .level-card__btn:hover { background: rgba(78, 205, 196, 0.35); }

        .level-card:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: #4ecdc4;
        }

        .level-card h4 {
          color: #4ecdc4;
          margin: 0 0 0.5rem 0;
        }

        .level-card p {
          color: #ccc;
          margin: 0;
          font-size: 0.9rem;
        }

        /* Steps (right panel) */
        .badge-steps { background: rgba(255,255,255,0.06); border-radius: 16px; padding: 20px 24px; backdrop-filter: blur(6px); }
        .badge-steps__title { margin: 0 0 12px; font-size: 20px; font-weight: 700; }
        .badge-steps__list { margin: 0; padding-left: 0; list-style: none; }
        .badge-steps__list li { position: relative; padding-left: 28px; margin: 10px 0; white-space: pre-line; }
        .badge-steps__list li::before { content: '✅'; position: absolute; left: 0; top: 0; line-height: 1.1; }

        /* Bottom levels grid */
        .levels-grid-bottom {
          display: flex;
          justify-content: center; /* центрируем по горизонтали */
          gap: 24px;               /* расстояние между кружочками */
          margin-top: 16px;
          flex-wrap: wrap;
          align-items: flex-start;
        }
        .level-card-bottom { display: flex; flex-direction: column; align-items: center; padding: 0; border-radius: 0; background: transparent; backdrop-filter: none; min-height: auto; cursor: pointer; transition: all 0.3s ease; }
        .level-card-bottom:hover { transform: translateY(-4px); background: transparent; }
        .level-card__icon { width: 100px; height: 100px; border-radius: 50%; display: grid; place-items: center; margin-bottom: 16px; background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.25); transition: all 0.3s ease; }
                 .level-card__title { text-align: center; font-size: 17px; line-height: 1.2; margin: 6px 0 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-word; hyphens: auto; color: #4ecdc4; white-space: pre-line !important; }
        .level-card__subtitle { opacity: .85; font-size: 14px; text-align: center; color: #ccc; }
        
        .level-card-bottom:hover .level-card__icon {
          background: rgba(255, 255, 255, 0.1);
          border-color: #4ecdc4;
          box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
          transform: scale(1.1);
        }
        
                 .level-bubble__emoji {
           font-size: 2.5rem;
           transition: all 0.3s ease;
         }
         
         .level-card-bottom:hover .level-bubble__emoji {
           transform: scale(1.2);
           filter: drop-shadow(0 0 10px rgba(78, 205, 196, 0.5));
         }

                 @media (max-width: 768px) {
           .intro-content {
             max-width: 95vw;
             max-height: 95vh;
             padding: 1rem;
             margin: 1rem;
           }

           .intro-content h1 {
             font-size: 1.8rem;
           }

           .intro-content p {
             font-size: 0.9rem;
           }

           .philosophy-main {
             font-size: 1rem !important;
           }

           .point {
             flex-direction: column;
             text-align: center;
             padding: 0.6rem;
           }

           .point-icon {
             align-self: center;
             font-size: 1.2rem;
           }

           .philosophy-ending {
             font-size: 0.9rem !important;
             padding: 0.6rem;
           }

           .start-instruction {
             font-size: 0.9rem;
           }

           .start-button {
             padding: 0.6rem 1.2rem;
             font-size: 1rem;
           }

           .categories-grid,
           .badges-grid {
             grid-template-columns: 1fr;
           }

                       .header h1 {
              font-size: 1.8rem;
            }

           .badge-header,
           .level-header {
             flex-direction: column;
             text-align: center;
           }
         }
        /* Точечные правки для группы 1.4 */
        .badge--group-1-4 .badge-summary__right {
          height: auto;
          min-height: 100%;
          overflow: visible;
          padding-bottom: 24px;
        }
        .badge--group-1-4 .levels-grid-bottom { margin-top: 1rem; }
        .badge-evidence { margin-top: 0.6rem; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 0.6rem; }

        /* Стили для новых экранов */
        .header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .hint-button, .material-button {
          background: rgba(0, 0, 0, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.2), inset 0 0 10px rgba(0, 0, 0, 0.3);
        }

        .hint-button:hover, .material-button:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.8);
          background: rgba(0, 0, 0, 0.3);
          box-shadow: 0 0 25px rgba(255, 255, 255, 0.4), inset 0 0 15px rgba(0, 0, 0, 0.4);
        }

        .additional-materials-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 0.5rem;
        }

        .introduction-screen, .additional-material-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 1rem;
          background: 
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('./экран 3 фон.png') center center / cover no-repeat;
        }

        .introduction-content, .additional-material-content {
          max-width: 700px;
          margin: 0 auto;
          background: rgba(0, 0, 0, 0.4);
          padding: 1.5rem;
          border-radius: 15px;
          backdrop-filter: blur(15px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 215, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .introduction-content::before, .additional-material-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .introduction-text, .additional-material-text {
          color: #ffffff;
          line-height: 1.5;
          font-size: 0.95rem;
          position: relative;
          z-index: 1;
          white-space: pre-line;
        }

        /* Нормализация текста - убираем лишние пробелы и разрывы */
        .introduction-text *, .additional-material-text * {
          white-space: normal;
        }

        .introduction-text p, .additional-material-text p {
          white-space: pre-line;
        }

        /* Убираем двойные пробелы и нормализуем текст */
        .introduction-text, .additional-material-text {
          text-rendering: optimizeLegibility;
          font-variant-ligatures: none;
        }

        /* Нормализация пробелов в тексте */
        .introduction-text p, .additional-material-text p {
          text-align: justify;
          word-spacing: normal;
          letter-spacing: normal;
        }

        /* Убираем лишние отступы в начале и конце */
        .introduction-text p:first-child, .additional-material-text p:first-child {
          margin-top: 0;
        }

        .introduction-text p:last-child, .additional-material-text p:last-child {
          margin-bottom: 0;
        }

        /* Обработка HTML контента с лишними пробелами */
        .introduction-text br + br, .additional-material-text br + br {
          display: none;
        }

        .introduction-text p:empty, .additional-material-text p:empty {
          display: none;
        }

        /* Убираем лишние разрывы между абзацами */
        .introduction-text p + p, .additional-material-text p + p {
          margin-top: 0.1rem !important;
        }

        /* Убираем лишние разрывы после заголовков */
        .introduction-text h1 + p, .additional-material-text h1 + p,
        .introduction-text h2 + p, .additional-material-text h2 + p,
        .introduction-text h3 + p, .additional-material-text h3 + p,
        .introduction-text h4 + p, .additional-material-text h4 + p {
          margin-top: 0.1rem !important;
        }

        /* Убираем лишние разрывы перед заголовками */
        .introduction-text p + h1, .additional-material-text p + h1,
        .introduction-text p + h2, .additional-material-text p + h2,
        .introduction-text p + h3, .additional-material-text p + h3,
        .introduction-text p + h4, .additional-material-text p + h4 {
          margin-top: 0.2rem !important;
        }

        /* Нормализация пробелов в HTML */
        .introduction-text, .additional-material-text {
          font-kerning: normal;
          text-transform: none;
        }

        /* Агрессивное убирание всех лишних отступов */
        .introduction-text *, .additional-material-text * {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }

        /* Восстанавливаем минимальные отступы только там, где нужно */
        .introduction-text p, .additional-material-text p {
          margin-top: 0.1rem !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h1, .additional-material-text h1 {
          margin-top: 0 !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h2, .additional-material-text h2 {
          margin-top: 0.2rem !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h3, .additional-material-text h3 {
          margin-top: 0.2rem !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h4, .additional-material-text h4 {
          margin-top: 0.1rem !important;
          margin-bottom: 0.05rem !important;
        }


        /* Убираем лишние отступы между заголовками и параграфами */
        .introduction-text h1 + p, .additional-material-text h1 + p,
        .introduction-text h2 + p, .additional-material-text h2 + p,
        .introduction-text h3 + p, .additional-material-text h3 + p,
        .introduction-text h4 + p, .additional-material-text h4 + p {
          margin-top: 0.1rem;
        }

        .introduction-text p + h1, .additional-material-text p + h1,
        .introduction-text p + h2, .additional-material-text p + h2,
        .introduction-text p + h3, .additional-material-text p + h3,
        .introduction-text p + h4, .additional-material-text p + h4 {
          margin-top: 0.2rem;
        }

        .introduction-text h1 + h2, .additional-material-text h1 + h2,
        .introduction-text h2 + h3, .additional-material-text h2 + h3,
        .introduction-text h3 + h4, .additional-material-text h3 + h4 {
          margin-top: 0.1rem;
        }

        .introduction-text h1, .additional-material-text h1 {
          color: #FFD700;
          font-size: 1.8rem;
          margin-top: 0;
          margin-bottom: 0.1rem;
          text-align: center;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-weight: bold;
        }

        .introduction-text h2, .additional-material-text h2 {
          color: #FFA500;
          font-size: 1.4rem;
          margin-top: 0.2rem;
          margin-bottom: 0.1rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          font-weight: 600;
        }

        .introduction-text h3, .additional-material-text h3 {
          color: #FFD700;
          font-size: 1.1rem;
          margin-top: 0.2rem;
          margin-bottom: 0.1rem;
          font-weight: 600;
        }

        .introduction-text h4, .additional-material-text h4 {
          color: #FFA500;
          font-size: 1rem;
          margin-top: 0.1rem;
          margin-bottom: 0.05rem;
          font-weight: 600;
        }

        .introduction-text p, .additional-material-text p {
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          color: #e8e8e8;
          opacity: 0.95;
        }

        .introduction-text ul, .additional-material-text ul,
        .introduction-text ol, .additional-material-text ol {
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          padding-left: 1.2rem;
        }

        .introduction-text li, .additional-material-text li {
          margin-top: 0.02rem;
          margin-bottom: 0.02rem;
          color: #e8e8e8;
          opacity: 0.95;
        }

        .introduction-text strong, .additional-material-text strong {
          color: #FFD700;
          font-weight: bold;
          opacity: 1;
        }

        .introduction-text em, .additional-material-text em {
          color: #FFA500;
          font-style: italic;
          opacity: 1;
        }

        .introduction-text pre, .additional-material-text pre {
          background: rgba(0, 0, 0, 0.6);
          padding: 0.6rem;
          border-radius: 8px;
          overflow-x: auto;
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .introduction-text code, .additional-material-text code {
          background: rgba(0, 0, 0, 0.6);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          color: #FFD700;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .introduction-text blockquote, .additional-material-text blockquote {
          border-left: 3px solid #FFD700;
          padding-left: 0.6rem;
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          background: rgba(255, 215, 0, 0.1);
          padding: 0.6rem;
          border-radius: 0 8px 8px 0;
        }

        /* Адаптивность для мобильных устройств */
        @media (max-width: 768px) {
          .additional-materials-buttons {
            flex-direction: column;
            align-items: center;
          }

          .material-button {
            width: 100%;
            max-width: 200px;
          }

          .introduction-content, .additional-material-content {
            padding: 1.2rem;
            margin: 0.5rem;
            max-width: 95%;
          }

          .introduction-text h1, .additional-material-text h1 {
            font-size: 1.6rem;
          }

          .introduction-text h2, .additional-material-text h2 {
            font-size: 1.3rem;
          }

          .introduction-text h3, .additional-material-text h3 {
            font-size: 1.1rem;
          }

          .introduction-text h4, .additional-material-text h4 {
            font-size: 1rem;
          }
        }

        /* Session Info Styles */
        .session-info {
          background: 
            linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)),
            url('./pictures/весна 2.jpg') center 10%/50% no-repeat;
          border: 2px solid rgba(255, 215, 0, 0.6);
          border-radius: 15px;
          padding: 15px;
          margin: 15px 0;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(5px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .session-info::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: -200% 0; }
        }

        .session-info.clickable:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(255, 215, 0, 0.3);
          border-color: rgba(255, 215, 0, 0.9);
          background: 
            linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
            url('./pictures/весна 2.jpg') center 10%/50% no-repeat;
        }

        .session-info h4 {
          color: #FFD700;
          margin-bottom: 10px;
          font-size: 16px;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }

        .session-info p {
          color: #ffffff;
          margin-bottom: 8px;
          font-size: 13px;
          line-height: 1.4;
        }

        .session-info ul {
          color: #ffffff;
          margin: 10px 0;
          padding-left: 20px;
        }

        .session-info li {
          margin-bottom: 5px;
          font-size: 13px;
          line-height: 1.3;
        }

        .session-info em {
          color: #FFD700;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .session-image {
          width: 100%;
          max-width: 300px;
          height: auto;
          border-radius: 10px;
          margin-bottom: 12px;
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .session-info:hover .session-image {
          transform: scale(1.02);
          box-shadow: 0 12px 25px rgba(255, 215, 0, 0.2);
        }

        /* Registration Form Styles */
        .registration-form-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 1rem;
          background: 
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('./экран 3 фон.png') center center / cover no-repeat;
        }

        .registration-form-content {
          max-width: 500px;
          margin: 0 auto;
          padding: 1.5rem 0;
        }

        .form-container {
          background: rgba(0, 0, 0, 0.4);
          padding: 1.5rem;
          border-radius: 15px;
          backdrop-filter: blur(15px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 215, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        .form-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .form-container h2 {
          color: #FFD700;
          font-size: 22px;
          margin-bottom: 8px;
          text-align: center;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-weight: bold;
        }

        .form-container p {
          color: #ffffff;
          text-align: center;
          margin-bottom: 25px;
          font-size: 14px;
          opacity: 0.8;
          line-height: 1.4;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          color: #FFD700;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 6px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid rgba(255, 215, 0, 0.4);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.3);
          color: #ffffff;
          font-size: 14px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: rgba(255, 215, 0, 0.8);
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
          background: rgba(0, 0, 0, 0.5);
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 70px;
        }

        .submit-button {
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #2c3e50;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.3);
          margin-top: 15px;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
          background: linear-gradient(135deg, #FFE55C 0%, #FFB84D 100%);
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* Адаптивность для мобильных устройств */
        @media (max-width: 768px) {
          .registration-form-content {
            padding: 1rem 0;
            max-width: 90%;
          }

          .form-container {
            padding: 1.2rem;
            margin: 0 0.5rem;
          }

          .form-container h2 {
            font-size: 18px;
          }

          .form-container p {
            font-size: 13px;
          }

          .form-group input,
          .form-group textarea {
            font-size: 16px; /* Предотвращает зум на iOS */
            padding: 12px 14px;
          }

          .submit-button {
            padding: 14px 20px;
            font-size: 16px;
          }
        }
      `})]})};V.createRoot(document.getElementById("root")).render(e.jsx(Me.StrictMode,{children:e.jsx(Ye,{})}));
//# sourceMappingURL=index-c7916b49.js.map
