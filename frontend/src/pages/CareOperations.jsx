import { useEffect, useState } from 'react';
import api from '../api';

const panel={background:'#fff',border:'1px solid #dbe4ed',borderRadius:12,padding:20,boxShadow:'0 3px 14px #1020300a'};
export default function CareOperations({user,onLogout}) {
  const [clients,setClients]=useState([]),[caregivers,setCaregivers]=useState([]),[visits,setVisits]=useState([]),[incidents,setIncidents]=useState([]),[error,setError]=useState('');
  const [form,setForm]=useState({clientId:'',caregiverUserId:'',startAt:'',endAt:'',sourceReference:''});
  const canCoordinate=['ADMIN','CASEWORKER','CLINICIAN'].includes(user.role);
  async function load(){try{const [c,v]=await Promise.all([api.get('/care/clients'),api.get('/care/visits')]);setClients(c.data);setVisits(v.data);if(canCoordinate){const [g,i]=await Promise.all([api.get('/care/caregivers'),api.get('/care/incidents')]);setCaregivers(g.data);setIncidents(i.data)}setError('')}catch(reason){setError(reason.response?.data?.error||'Unable to load authorized care operations')}}
  useEffect(()=>{
    let active=true;
    const clientsRequest=api.get('/care/clients');
    const visitsRequest=api.get('/care/visits');
    const coordinatorRequests=canCoordinate
      ? [api.get('/care/caregivers'),api.get('/care/incidents')]
      : [Promise.resolve({data:[]}),Promise.resolve({data:[]})];
    Promise.all([clientsRequest,visitsRequest,...coordinatorRequests])
      .then(([clientResponse,visitResponse,caregiverResponse,incidentResponse])=>{
        if(!active)return;
        setClients(clientResponse.data);
        setVisits(visitResponse.data);
        setCaregivers(caregiverResponse.data);
        setIncidents(incidentResponse.data);
        setError('');
      })
      .catch(reason=>{if(active)setError(reason.response?.data?.error||'Unable to load authorized care operations')});
    return()=>{active=false};
  },[canCoordinate]);
  async function propose(event){event.preventDefault();try{await api.post('/care/visits',{...form,startAt:new Date(form.startAt).toISOString(),endAt:new Date(form.endAt).toISOString()});await load()}catch(reason){setError(reason.response?.data?.error||'Proposal failed')}}
  return <div className="shell"><header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}><div><h1 style={{margin:0}}>IHSS governed care scheduling</h1><div style={{color:'#5d6d7e'}}>Signed in as {user.name} · {user.role}</div></div><button onClick={onLogout}>Sign out</button></header>
  {error&&<div style={{background:'#fff1f1',border:'1px solid #d33',padding:12,marginBottom:16}}>{error}</div>}
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}><section style={panel}><h2>Authorized clients</h2>{clients.map(c=><div key={c.id} style={{padding:'9px 0',borderBottom:'1px solid #edf1f4'}}><strong>{c.displayLabel||'Restricted identity'}</strong><div>{c.identityConfidence} · hold: {String(c.legalHold)}</div></div>)}</section>
  {canCoordinate&&<section style={panel}><h2>Propose reviewed visit</h2><p>Every proposal is deterministically checked and must be independently reviewed by a clinician before assignment.</p><form onSubmit={propose} style={{display:'grid',gap:10}}><select required value={form.clientId} onChange={e=>setForm({...form,clientId:e.target.value})}><option value="">Client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.displayLabel||c.id}</option>)}</select><select required value={form.caregiverUserId} onChange={e=>setForm({...form,caregiverUserId:e.target.value})}><option value="">Caregiver</option>{caregivers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.skills.join(', ')}</option>)}</select><input required type="datetime-local" value={form.startAt} onChange={e=>setForm({...form,startAt:e.target.value})}/><input required type="datetime-local" value={form.endAt} onChange={e=>setForm({...form,endAt:e.target.value})}/><input required placeholder="Referral/source reference" value={form.sourceReference} onChange={e=>setForm({...form,sourceReference:e.target.value})}/><button type="submit">Propose for review</button></form></section>}</div>
  <section style={{...panel,marginTop:18}}><h2>Visits and handoffs</h2>{visits.map(v=><div key={v.id} style={{padding:'10px 0',borderBottom:'1px solid #edf1f4'}}><strong>{v.status}</strong> · {v.caregiver_name} · {new Date(v.start_at).toLocaleString()}<div style={{color:v.risk_flags.length?'#9b2c2c':'#287a50'}}>Safety flags: {v.risk_flags.join(', ')||'none; clinician review pending'}</div></div>)}</section>
  <section style={{...panel,marginTop:18}}><h2>Safety escalations</h2>{incidents.map(i=><div key={i.id}><strong>{i.severity}</strong> · {i.summary}</div>)}</section></div>;
}
