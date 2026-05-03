import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, SafeAreaView, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeEmailKey, firestoreGet, firestoreSet } from './firebaseConfig';

const TODAY = new Date();
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function uid() { return Math.random().toString(36).slice(2); }
function todayKey() { return dateKey(TODAY); }
function tomorrowKey() {
  const d = new Date(TODAY); d.setDate(d.getDate()+1); return dateKey(d);
}
function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hh = +h;
  return `${hh%12||12}:${m} ${hh>=12?'PM':'AM'}`;
}
function formatDue(s) {
  if (!s) return '';
  const [y,mo,d] = s.split('-');
  return new Date(+y,+mo-1,+d).toLocaleDateString('en-IN',{month:'short',day:'numeric'});
}

const C = {
  bg:'#f7f6f2', surface:'#ffffff', surface2:'#f3f0ec',
  border:'#dcd9d5', text:'#28251d', textMuted:'#7a7974',
  textFaint:'#bab9b4', primary:'#01696f', primaryLight:'#cedcd8',
  error:'#a12c7b', errorLight:'#e0ced7',
  warning:'#964219', warningLight:'#ddcfc6',
  success:'#437a22', successLight:'#d4dfcc',
  gold:'#d19900', goldLight:'#e9e0c6',
};

const EVENT_COLORS = ['#01696f','#7a39bb','#d19900','#006494','#437a22','#a12c7b'];

const SEED_TASKS = [
  { id:uid(), text:'Review project proposal', done:false, priority:'high', dueDate:todayKey(), carriedOver:false },
  { id:uid(), text:'Update documentation', done:false, priority:'med', dueDate:todayKey(), carriedOver:false },
  { id:uid(), text:'Send weekly report', done:true, priority:'med', dueDate:todayKey(), carriedOver:false },
];

const SEED_EVENTS = {
  [todayKey()]: [
    { id:uid(), title:'Morning standup', start:'09:00', end:'09:30', color:'#01696f' },
    { id:uid(), title:'Design review', start:'14:00', end:'15:00', color:'#7a39bb' },
  ]
};

export default function App() {
  const [tab, setTab] = useState('calendar');
  const [tasks, setTasksState] = useState([]);
  const [events, setEventsState] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState(todayKey());
  const [viewYear, setViewYear] = useState(TODAY.getFullYear());
  const [viewMonth, setViewMonth] = useState(TODAY.getMonth());
  const [showEvtForm, setShowEvtForm] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtStart, setEvtStart] = useState('09:00');
  const [evtEnd, setEvtEnd] = useState('10:00');
  const [evtColor, setEvtColor] = useState(EVENT_COLORS[0]);
  const [newTask, setNewTask] = useState('');
  const [taskPriority, setTaskPriority] = useState('med');
  const [taskFilter, setTaskFilter] = useState('all');

  const [email, setEmailState] = useState('');
  const [publicKey, setPublicKeyState] = useState('');
  const [serviceId, setServiceIdState] = useState('');
  const [templateId, setTemplateIdState] = useState('');
  const [sendTime, setSendTimeState] = useState('21:00');
  const [autoCarry, setAutoCarry] = useState(true);

  // ─── Firestore REST helpers ───────────────────────────────────────
  async function loadFromFirestore(userEmail) {
    try {
      const key = safeEmailKey(userEmail);
      const data = await firestoreGet('users', key);
      if (data) {
        if (data.tasks) setTasksState(data.tasks);
        if (data.events) setEventsState(data.events);
        return true;
      }
    } catch (e) {
      console.log('Firestore load error:', e);
    }
    return false;
  }

  async function saveToFirestore(userEmail, newTasks, newEvents) {
    if (!userEmail) return;
    try {
      setSyncing(true);
      const key = safeEmailKey(userEmail);
      await firestoreSet('users', key, {
        email: userEmail,
        tasks: JSON.stringify(newTasks),
        events: JSON.stringify(newEvents),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.log('Firestore save error:', e);
    } finally {
      setSyncing(false);
    }
  }

  // ─── Load settings + data on mount ───────────────────────────────
  React.useEffect(() => {
    async function init() {
      try {
        const keys = ['email','publicKey','serviceId','templateId','sendTime'];
        const pairs = await AsyncStorage.multiGet(keys);
        let savedEmail = '';
        pairs.forEach(([key, val]) => {
          if (!val) return;
          if (key === 'email') { setEmailState(val); savedEmail = val; }
          if (key === 'publicKey') setPublicKeyState(val);
          if (key === 'serviceId') setServiceIdState(val);
          if (key === 'templateId') setTemplateIdState(val);
          if (key === 'sendTime') setSendTimeState(val);
        });
        if (savedEmail) {
          const loaded = await loadFromFirestore(savedEmail);
          if (!loaded) { setTasksState(SEED_TASKS); setEventsState(SEED_EVENTS); }
        } else {
          setTasksState(SEED_TASKS);
          setEventsState(SEED_EVENTS);
        }
      } catch (e) {
        setTasksState(SEED_TASKS);
        setEventsState(SEED_EVENTS);
      } finally {
        setDataLoaded(true);
      }
    }
    init();
  }, []);

  // ─── Auto-sync on change ──────────────────────────────────────────
  React.useEffect(() => {
    if (!dataLoaded || !email) return;
    saveToFirestore(email, tasks, events);
  }, [tasks, events, dataLoaded]);

  // ─── Settings setters ─────────────────────────────────────────────
  function setEmail(v) {
    setEmailState(v);
    AsyncStorage.setItem('email', v);
    if (v && dataLoaded) loadFromFirestore(v);
  }
  function setPublicKey(v) { setPublicKeyState(v); AsyncStorage.setItem('publicKey', v); }
  function setServiceId(v) { setServiceIdState(v); AsyncStorage.setItem('serviceId', v); }
  function setTemplateId(v) { setTemplateIdState(v); AsyncStorage.setItem('templateId', v); }
  function setSendTime(v) { setSendTimeState(v); AsyncStorage.setItem('sendTime', v); }

  // ─── Task/Event mutators ──────────────────────────────────────────
  function setTasks(val) {
    const next = typeof val === 'function' ? val(tasks) : val;
    setTasksState(next);
  }
  function setEvents(val) {
    const next = typeof val === 'function' ? val(events) : val;
    setEventsState(next);
  }

  function renderCalendar() {
    const first = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay();
    const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevDays = new Date(viewYear, viewMonth, 0).getDate();
    const cells = [];
    DAYS.forEach(d => cells.push(
      <View key={'h'+d} style={s.dayName}><Text style={s.dayNameTxt}>{d}</Text></View>
    ));
    for (let i = startDow-1; i >= 0; i--) cells.push(calCell(new Date(viewYear, viewMonth-1, prevDays-i), true));
    for (let d = 1; d <= dim; d++) cells.push(calCell(new Date(viewYear, viewMonth, d), false));
    const rem = (7-(startDow+dim)%7)%7;
    for (let d = 1; d <= rem; d++) cells.push(calCell(new Date(viewYear, viewMonth+1, d), true));
    return cells;
  }

  function calCell(date, otherMonth) {
    const key = dateKey(date);
    const isToday = key === todayKey();
    const isSelected = key === selected;
    const hasEvents = events[key] && events[key].length > 0;
    return (
      <TouchableOpacity key={key+(otherMonth?'o':'')} style={s.calCell} onPress={() => setSelected(key)}>
        <View style={[s.calNum, isToday && s.calNumToday, isSelected && !isToday && s.calNumSelected]}>
          <Text style={[s.calNumTxt, otherMonth&&{color:C.textFaint}, isToday&&{color:'#fff'}, isSelected&&!isToday&&{color:C.primary}]}>
            {date.getDate()}
          </Text>
        </View>
        {hasEvents && (
          <View style={s.dotRow}>
            {events[key].slice(0,3).map((e,i) => <View key={i} style={[s.dot,{backgroundColor:e.color}]} />)}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  function saveEvent() {
    if (!evtTitle.trim()) return;
    const updated = {...events};
    if (!updated[selected]) updated[selected] = [];
    updated[selected] = [...updated[selected], {id:uid(), title:evtTitle.trim(), start:evtStart, end:evtEnd, color:evtColor}];
    setEvents(updated);
    setEvtTitle('');
    setShowEvtForm(false);
  }

  function deleteEvent(id) {
    const updated = {...events};
    updated[selected] = (updated[selected]||[]).filter(e => e.id !== id);
    setEvents(updated);
  }

  function addTask() {
    if (!newTask.trim()) return;
    setTasks([{id:uid(), text:newTask.trim(), done:false, priority:taskPriority, dueDate:todayKey(), carriedOver:false}, ...tasks]);
    setNewTask('');
  }

  function toggleTask(id) { setTasks(tasks.map(t => t.id===id ? {...t, done:!t.done} : t)); }
  function deleteTask(id) { setTasks(tasks.filter(t => t.id!==id)); }

  function filteredTasks() {
    const base = [...tasks].sort((a,b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return ({high:0,med:1,low:2}[a.priority]) - ({high:0,med:1,low:2}[b.priority]);
    });
    if (taskFilter==='today') return base.filter(t => t.dueDate===todayKey());
    if (taskFilter==='pending') return base.filter(t => !t.done);
    if (taskFilter==='done') return base.filter(t => t.done);
    return base;
  }

  const todayTasks = tasks.filter(t => t.dueDate===todayKey());
  const doneTasks = todayTasks.filter(t => t.done);
  const pct = todayTasks.length ? Math.round(doneTasks.length/todayTasks.length*100) : 0;

  async function sendReport(isTest=false) {
    if (!publicKey||!serviceId||!templateId||!email) {
      Alert.alert('Missing Info','Please fill in all EmailJS settings first!'); return;
    }
    const pending = todayTasks.filter(t => !t.done);
    const done = todayTasks.filter(t => t.done);
    if (autoCarry && !isTest) {
      const tmr = tomorrowKey();
      const tmrTexts = tasks.filter(t => t.dueDate===tmr).map(t => t.text);
      const carried = pending.filter(t => !tmrTexts.includes(t.text)).map(t => ({...t, id:uid(), dueDate:tmr, carriedOver:true, done:false}));
      if (carried.length) setTasks(prev => [...prev, ...carried]);
    }
    const dateStr = TODAY.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const subjectDateStr = TODAY.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
    let body = `Hi Buddy! 👋\n\nHere is the status of your tasks for today.\n📅 ${dateStr}\n${'─'.repeat(40)}\n\n📊 PROGRESS: ${done.length}/${todayTasks.length} tasks completed (${pct}%)\n\n`;
    if (done.length) { body += `✅ COMPLETED (${done.length})\n`; done.forEach(t => { body += `  ✓ ${t.text} [${t.priority.toUpperCase()}]\n`; }); body += '\n'; }
    if (pending.length) { body += `⏳ PENDING — ROLLING OVER TO TOMORROW (${pending.length})\n`; pending.forEach(t => { body += `  → ${t.text} [${t.priority.toUpperCase()}]\n`; }); body += '\n'; }
    if (!done.length && !pending.length) body += `No tasks for today.\n\n`;
    body += `${'─'.repeat(40)}\nKeep going, you're doing great! 💪\n— Your Buddy 🤝`;
    const subject = isTest ? `[TEST] DayFlow Daily Summary — ${subjectDateStr}` : `DayFlow Daily Summary — ${subjectDateStr}`;
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({service_id:serviceId, template_id:templateId, user_id:publicKey,
          template_params:{to_email:email, subject, message:body, from_name:'DayFlow'}}),
      });
      const txt = await res.text();
      if (res.ok) Alert.alert('✅ Sent!', `Report delivered to ${email}`);
      else Alert.alert('❌ Failed', `${res.status}: ${txt}`);
    } catch(e) { Alert.alert('❌ Error', e.message); }
  }

  const prioStyle = p => p==='high' ? {bg:C.errorLight,color:C.error} : p==='med' ? {bg:C.warningLight,color:C.warning} : {bg:C.successLight,color:C.success};

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      <View style={s.topbar}>
        <Text style={s.logo}>🗓 DayFlow</Text>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          {syncing && <ActivityIndicator size="small" color={C.primary} />}
          {syncing && <Text style={{fontSize:11,color:C.textMuted}}>Syncing…</Text>}
          <Text style={s.todayTxt}>{TODAY.toLocaleDateString('en-IN',{weekday:'short',month:'short',day:'numeric'})}</Text>
        </View>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:80}} keyboardShouldPersistTaps="handled">
        {tab==='calendar' && (
          <View style={s.tabContent}>
            <View style={s.calHeader}>
              <TouchableOpacity onPress={() => {if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);}}>
                <Text style={s.navBtn}>‹</Text>
              </TouchableOpacity>
              <Text style={s.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={() => {if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);}}>
                <Text style={s.navBtn}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={s.calGrid}>{renderCalendar()}</View>
            <View style={s.section}>
              <Text style={s.sectionTitle}>{selected===todayKey()?`Today · ${selected}`:selected}</Text>
              {(events[selected]||[]).length===0 && <Text style={s.emptyTxt}>No events for this day</Text>}
              {(events[selected]||[]).map(ev => (
                <View key={ev.id} style={s.eventCard}>
                  <View style={[s.evtDot,{backgroundColor:ev.color}]} />
                  <View style={{flex:1}}>
                    <Text style={s.evtTitle}>{ev.title}</Text>
                    <Text style={s.evtTime}>{fmt12(ev.start)} – {fmt12(ev.end)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteEvent(ev.id)}><Text style={{color:C.textFaint,fontSize:18}}>×</Text></TouchableOpacity>
                </View>
              ))}
              {showEvtForm ? (
                <View style={s.form}>
                  <TextInput style={s.input} placeholder="Event title…" placeholderTextColor={C.textMuted} value={evtTitle} onChangeText={setEvtTitle} />
                  <View style={{flexDirection:'row',gap:8}}>
                    <TextInput style={[s.input,{flex:1}]} placeholder="Start 09:00" placeholderTextColor={C.textMuted} value={evtStart} onChangeText={setEvtStart} />
                    <TextInput style={[s.input,{flex:1}]} placeholder="End 10:00" placeholderTextColor={C.textMuted} value={evtEnd} onChangeText={setEvtEnd} />
                  </View>
                  <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
                    {EVENT_COLORS.map(c => <TouchableOpacity key={c} onPress={() => setEvtColor(c)} style={[s.swatch,{backgroundColor:c},evtColor===c&&s.swatchActive]} />)}
                  </View>
                  <View style={{flexDirection:'row',gap:8}}>
                    <TouchableOpacity style={[s.btn,s.btnGhost,{flex:1}]} onPress={() => setShowEvtForm(false)}><Text style={{color:C.textMuted}}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={[s.btn,s.btnPrimary,{flex:1}]} onPress={saveEvent}><Text style={{color:'#fff',fontWeight:'700'}}>Save</Text></TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={s.addTrigger} onPress={() => setShowEvtForm(true)}>
                  <Text style={{color:C.primary,fontWeight:'600'}}>＋ Add Event</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {tab==='tasks' && (
          <View style={s.tabContent}>
            <View style={s.progressCard}>
              <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                <Text style={{fontSize:13,color:C.textMuted}}>Today's progress</Text>
                <Text style={{fontSize:13,color:C.primary,fontWeight:'700'}}>{pct}%</Text>
              </View>
              <View style={s.track}><View style={[s.fill,{width:`${pct}%`}]} /></View>
              <Text style={{fontSize:12,color:C.textFaint}}>{doneTasks.length} of {todayTasks.length} done</Text>
            </View>
            <View style={s.addCard}>
              <TextInput style={s.input} placeholder="Add a new task…" placeholderTextColor={C.textMuted} value={newTask} onChangeText={setNewTask} onSubmitEditing={addTask} returnKeyType="done" />
              <View style={{flexDirection:'row',gap:6}}>
                {['high','med','low'].map(p => (
                  <TouchableOpacity key={p} onPress={() => setTaskPriority(p)} style={[s.prioBtn, taskPriority===p&&{backgroundColor:C.primary}]}>
                    <Text style={{fontSize:11,fontWeight:'700',color:taskPriority===p?'#fff':C.textMuted}}>{p==='high'?'High':p==='med'?'Medium':'Low'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[s.btn,s.btnPrimary]} onPress={addTask}><Text style={{color:'#fff',fontWeight:'700'}}>＋ Add Task</Text></TouchableOpacity>
            </View>
            <View style={s.filterRow}>
              {['all','today','pending','done'].map(f => (
                <TouchableOpacity key={f} style={[s.filterTab,taskFilter===f&&s.filterTabActive]} onPress={() => setTaskFilter(f)}>
                  <Text style={[s.filterTxt,taskFilter===f&&{color:C.primary,fontWeight:'700'}]}>{f.charAt(0).toUpperCase()+f.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{paddingHorizontal:16,gap:8}}>
              {filteredTasks().length===0 && <Text style={s.emptyTxt}>No tasks here</Text>}
              {filteredTasks().map(task => {
                const ps = prioStyle(task.priority);
                return (
                  <View key={task.id} style={[s.taskCard,task.done&&{opacity:0.55},task.carriedOver&&{borderLeftWidth:3,borderLeftColor:C.gold}]}>
                    <TouchableOpacity onPress={() => toggleTask(task.id)} style={[s.checkbox,task.done&&{backgroundColor:C.primary,borderColor:C.primary}]}>
                      {task.done && <Text style={{color:'#fff',fontSize:11,fontWeight:'700'}}>✓</Text>}
                    </TouchableOpacity>
                    <View style={{flex:1,gap:4}}>
                      <Text style={[s.taskTxt,task.done&&{textDecorationLine:'line-through',color:C.textMuted}]}>{task.text}</Text>
                      <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
                        {task.dueDate ? <Text style={{fontSize:11,color:C.textMuted}}>{formatDue(task.dueDate)}</Text> : null}
                        <View style={[s.badge,{backgroundColor:ps.bg}]}><Text style={[s.badgeTxt,{color:ps.color}]}>{task.priority==='high'?'High':task.priority==='med'?'Medium':'Low'}</Text></View>
                        {task.carriedOver && <View style={[s.badge,{backgroundColor:C.goldLight}]}><Text style={[s.badgeTxt,{color:C.gold}]}>Carried over</Text></View>}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => deleteTask(task.id)}><Text style={{color:C.textFaint,fontSize:18}}>×</Text></TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {tab==='settings' && (
          <View style={s.tabContent}>
            <View style={s.infoBox}>
              <Text style={{color:C.primary,fontSize:13,lineHeight:20}}>
                <Text style={{fontWeight:'700'}}>☁️ Cloud Sync:</Text> Your tasks and events sync to Firebase using your email. Same email on any device restores your data.{'\n\n'}
                <Text style={{fontWeight:'700'}}>EmailJS Setup:</Text> Get free keys at emailjs.com → create a service + template with to_email, subject, message variables.
              </Text>
            </View>
            {[
              {label:'Public Key', val:publicKey, set:setPublicKey, ph:'user_xxxxxxx'},
              {label:'Service ID', val:serviceId, set:setServiceId, ph:'service_xxxxxxx'},
              {label:'Template ID', val:templateId, set:setTemplateId, ph:'template_xxxxxxx'},
              {label:'Your Email (syncs data)', val:email, set:setEmail, ph:'you@example.com'},
              {label:'Daily Send Time', val:sendTime, set:setSendTime, ph:'21:00'},
            ].map(f => (
              <View key={f.label} style={s.settingGroup}>
                <Text style={s.settingLabel}>{f.label}</Text>
                <TextInput style={s.input} value={f.val} onChangeText={f.set} placeholder={f.ph} placeholderTextColor={C.textMuted} autoCapitalize="none" autoCorrect={false} />
              </View>
            ))}
            <View style={s.toggleRow}>
              <Text style={{flex:1,fontSize:14,color:C.text}}>Auto carry-over pending tasks</Text>
              <TouchableOpacity onPress={() => setAutoCarry(!autoCarry)} style={[s.toggleTrack,autoCarry&&{backgroundColor:C.primary}]}>
                <View style={[s.toggleKnob,autoCarry&&{transform:[{translateX:18}]}]} />
              </TouchableOpacity>
            </View>
            <View style={{paddingHorizontal:16,gap:10}}>
              <TouchableOpacity style={[s.btn,s.btnPrimary]} onPress={() => sendReport(false)}>
                <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>📤 Send Daily Report Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn,{borderWidth:2,borderColor:C.primary}]} onPress={() => sendReport(true)}>
                <Text style={{color:C.primary,fontWeight:'700'}}>🧪 Send Test Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={s.tabBar}>
        {[
          {key:'calendar',icon:'🗓',label:'Calendar'},
          {key:'tasks',icon:'✅',label:'Tasks'},
          {key:'settings',icon:'⚙️',label:'Settings'},
        ].map(t => (
          <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
            <Text style={{fontSize:22}}>{t.icon}</Text>
            <Text style={[s.tabLabel,tab===t.key&&{color:C.primary,fontWeight:'700'}]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#f7f6f2'},
  topbar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:14,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#dcd9d5'},
  logo:{fontSize:20,fontWeight:'700',color:'#28251d'},
  todayTxt:{fontSize:13,color:'#7a7974'},
  tabContent:{paddingTop:8},
  calHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:12},
  navBtn:{fontSize:28,color:'#01696f',paddingHorizontal:8},
  monthTitle:{fontSize:20,fontWeight:'700',color:'#28251d'},
  calGrid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:12},
  dayName:{width:'14.28%',alignItems:'center',paddingVertical:6},
  dayNameTxt:{fontSize:11,fontWeight:'700',color:'#7a7974',textTransform:'uppercase'},
  calCell:{width:'14.28%',alignItems:'center',paddingVertical:4,minHeight:48},
  calNum:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},
  calNumToday:{backgroundColor:'#01696f'},
  calNumSelected:{backgroundColor:'#cedcd8'},
  calNumTxt:{fontSize:14,fontWeight:'500',color:'#28251d'},
  dotRow:{flexDirection:'row',gap:2,marginTop:2},
  dot:{width:5,height:5,borderRadius:3},
  section:{marginHorizontal:16,marginTop:8},
  sectionTitle:{fontSize:17,fontWeight:'700',color:'#28251d',marginBottom:10},
  emptyTxt:{color:'#7a7974',fontSize:14,textAlign:'center',paddingVertical:20},
  eventCard:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderRadius:12,padding:14,marginBottom:8,gap:10,shadowColor:'#000',shadowOpacity:0.04,shadowRadius:4,elevation:1},
  evtDot:{width:10,height:10,borderRadius:5},
  evtTitle:{fontSize:15,fontWeight:'600',color:'#28251d'},
  evtTime:{fontSize:12,color:'#7a7974',marginTop:2},
  form:{backgroundColor:'#fff',borderRadius:14,padding:14,gap:10,marginTop:8,borderWidth:1,borderColor:'#dcd9d5'},
  input:{backgroundColor:'#f3f0ec',borderRadius:10,paddingHorizontal:14,paddingVertical:11,fontSize:14,color:'#28251d',borderWidth:1,borderColor:'#dcd9d5'},
  swatch:{width:26,height:26,borderRadius:13},
  swatchActive:{borderWidth:3,borderColor:'#28251d'},
  btn:{borderRadius:12,paddingVertical:13,alignItems:'center',justifyContent:'center'},
  btnPrimary:{backgroundColor:'#01696f'},
  btnGhost:{backgroundColor:'#f3f0ec',borderWidth:1,borderColor:'#dcd9d5'},
  addTrigger:{borderWidth:1.5,borderStyle:'dashed',borderColor:'#01696f',borderRadius:12,padding:14,alignItems:'center',marginTop:8,backgroundColor:'#cedcd8'},
  progressCard:{margin:16,backgroundColor:'#fff',borderRadius:14,padding:14,gap:8,shadowColor:'#000',shadowOpacity:0.04,shadowRadius:4,elevation:1},
  track:{height:7,backgroundColor:'#f3f0ec',borderRadius:99,overflow:'hidden'},
  fill:{height:'100%',backgroundColor:'#01696f',borderRadius:99},
  addCard:{marginHorizontal:16,marginBottom:12,backgroundColor:'#fff',borderRadius:14,padding:14,gap:10,shadowColor:'#000',shadowOpacity:0.04,shadowRadius:4,elevation:1},
  prioBtn:{paddingVertical:6,paddingHorizontal:12,borderRadius:20,backgroundColor:'#f3f0ec',borderWidth:1,borderColor:'#dcd9d5'},
  filterRow:{flexDirection:'row',marginHorizontal:16,marginBottom:12,backgroundColor:'#fff',borderRadius:12,padding:4},
  filterTab:{flex:1,paddingVertical:7,alignItems:'center',borderRadius:9},
  filterTabActive:{backgroundColor:'#f3f0ec'},
  filterTxt:{fontSize:12,color:'#7a7974'},
  taskCard:{backgroundColor:'#fff',borderRadius:12,padding:14,flexDirection:'row',alignItems:'flex-start',gap:10,shadowColor:'#000',shadowOpacity:0.03,shadowRadius:3,elevation:1,marginBottom:0},
  checkbox:{width:20,height:20,borderRadius:5,borderWidth:2,borderColor:'#dcd9d5',alignItems:'center',justifyContent:'center',marginTop:2},
  taskTxt:{fontSize:15,fontWeight:'600',color:'#28251d',lineHeight:20},
  badge:{paddingHorizontal:8,paddingVertical:2,borderRadius:20},
  badgeTxt:{fontSize:11,fontWeight:'700'},
  infoBox:{margin:16,backgroundColor:'#cedcd8',borderRadius:12,padding:14},
  settingGroup:{marginHorizontal:16,marginBottom:10},
  settingLabel:{fontSize:11,fontWeight:'700',color:'#7a7974',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4},
  toggleRow:{flexDirection:'row',alignItems:'center',marginHorizontal:16,marginBottom:16,backgroundColor:'#fff',borderRadius:12,padding:14,gap:12},
  toggleTrack:{width:40,height:22,borderRadius:11,backgroundColor:'#dcd9d5',padding:3},
  toggleKnob:{width:16,height:16,borderRadius:8,backgroundColor:'#fff'},
  tabBar:{flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#dcd9d5',paddingBottom:8,paddingTop:8},
  tabItem:{flex:1,alignItems:'center',gap:2},
  tabLabel:{fontSize:11,color:'#7a7974'},
});
