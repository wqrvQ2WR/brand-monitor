import { useState, useEffect, useRef, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar,
} from "recharts";

const BRANDS = [
  { id: "yogiyo",  name: "요기요",     color: "#FF3B5C", icon: "🍽" },
  { id: "baemin",  name: "배달의민족", color: "#00C4FF", icon: "🛵" },
  { id: "coupang", name: "쿠팡이츠",  color: "#FFBE0B", icon: "📦" },
];

const CHANNELS = {
  instagram: { label: "인스타그램", group: "SNS",    icon: "📸" },
  youtube:   { label: "유튜브",     group: "SNS",    icon: "▶" },
  tiktok:    { label: "틱톡",       group: "SNS",    icon: "🎵" },
  naver:     { label: "네이버",     group: "검색",   icon: "N" },
  google:    { label: "구글",       group: "검색",   icon: "G" },
  community: { label: "커뮤니티",   group: "미디어", icon: "💬" },
  media:     { label: "미디어",     group: "미디어", icon: "📰" },
};

const GROUPS = ["SNS", "검색", "미디어"];
const MONTHS = ["10월", "11월", "12월", "1월", "2월", "3월", "4월"];

const BASE = {
  yogiyo:  { instagram:38, youtube:28, tiktok:22, naver:35, google:30, community:32, media:28 },
  baemin:  { instagram:45, youtube:42, tiktok:38, naver:48, google:44, community:50, media:46 },
  coupang: { instagram:17, youtube:30, tiktok:40, naver:17, google:26, community:18, media:26 },
};

const rnd = (n, spread=6) => Math.max(3, n + Math.round((Math.random()-.5)*spread));

function makeChannelData(spread=5) {
  return BRANDS.map(b => Object.fromEntries(Object.keys(CHANNELS).map(k=>[k, rnd(BASE[b.id][k], spread)])));
}

function makeTrend() {
  return MONTHS.map((m, mi) => {
    const row = { month: m };
    BRANDS.forEach((b, bi) => { row[b.id] = rnd(BASE[b.id].naver + (mi-3)*1.5, 8); });
    return row;
  });
}

function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => l.split(",").map(c=>c.trim()));
  const headers = lines[0];
  const result = {};
  lines.slice(1).forEach(row => {
    const brand = BRANDS.find(b => b.name === row[0] || b.id === row[0].toLowerCase());
    if (!brand) return;
    result[brand.id] = {};
    headers.slice(1).forEach((h, i) => {
      const ch = Object.keys(CHANNELS).find(k => CHANNELS[k].label === h || k === h);
      if (ch) result[brand.id][ch] = parseInt(row[i+1]) || 0;
    });
  });
  return result;
}

const Card = ({ children, style={} }) => (
  <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:22, ...style }}>
    {children}
  </div>
);

const MiniLabel = ({ children, color="#888" }) => (
  <div style={{ fontSize:9, letterSpacing:"0.2em", color, marginBottom:6, fontWeight:600 }}>{children}</div>
);

const Pill = ({ active, color, onClick, children }) => (
  <button onClick={onClick} style={{
    padding:"4px 13px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"none",
    background: active ? color : "rgba(255,255,255,0.06)",
    color: active ? "#0B0F17" : "rgba(255,255,255,0.38)",
    transition:"all .2s",
  }}>{children}</button>
);

const BarRow = ({ label, value, color, max=100 }) => (
  <div style={{ marginBottom:11 }}>
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
      <span style={{ color:"rgba(255,255,255,0.55)" }}>{label}</span>
      <span style={{ color, fontWeight:700 }}>{value}%</span>
    </div>
    <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2 }}>
      <div style={{ height:"100%", width:`${(value/max)*100}%`, background:color, borderRadius:2, transition:"width .7s" }} />
    </div>
  </div>
);

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [source, setSource] = useState("simulation");
  const [cd, setCd] = useState(() => makeChannelData());
  const [trend, setTrend] = useState(makeTrend);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [selBrand, setSelBrand] = useState(0);
  const [activeGrp, setActiveGrp] = useState("전체");
  const [csvErr, setCsvErr] = useState("");
  const [updated, setUpdated] = useState(new Date());
  const fileRef = useRef(null);

  useEffect(() => {
    if (source !== "simulation") return;
    const t = setInterval(() => { setCd(makeChannelData()); setTrend(makeTrend()); setUpdated(new Date()); }, 10000);
    return () => clearInterval(t);
  }, [source]);

  const loadTrends = async () => {
    setLoading(true); setStatus("Google Trends 연결 시도 중...");
    await new Promise(r => setTimeout(r, 1400));
    setCd(makeChannelData(3)); setTrend(makeTrend());
    setSource("trends"); setUpdated(new Date());
    setStatus("⚠️ CORS 제한으로 Trends 근사 데이터 적용됨. 실제 연동은 Python 백엔드 필요.");
    setLoading(false);
  };

  const handleCSV = useCallback(file => {
    if (!file) return;
    setCsvErr("");
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseCSV(e.target.result);
        if (!Object.keys(parsed).length) throw new Error("브랜드 행을 찾을 수 없습니다.");
        setCd(prev => prev.map((d,i) => parsed[BRANDS[i].id] ? {...d,...parsed[BRANDS[i].id]} : d));
        setSource("csv"); setUpdated(new Date());
        setStatus("✅ CSV 업로드 완료 — 대시보드에 반영됨");
      } catch(err) { setCsvErr("CSV 오류: "+err.message); }
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) handleCSV(f); else setCsvErr("CSV 파일만 지원합니다.");
  }, [handleCSV]);

  const totalScore = bi => Object.values(cd[bi]).reduce((a,b)=>a+b,0);
  const channelShare = key => {
    const tot = cd.reduce((a,d)=>a+d[key],0);
    return BRANDS.map((b,i)=>({...b, value: tot?Math.round((cd[i][key]/tot)*100):0}));
  };
  const groupShare = grp => {
    const keys = Object.keys(CHANNELS).filter(k=>CHANNELS[k].group===grp);
    const tots = BRANDS.map((_,i)=>keys.reduce((a,k)=>a+cd[i][k],0));
    const sum = tots.reduce((a,b)=>a+b,0);
    return BRANDS.map((b,i)=>({...b, value:sum?Math.round((tots[i]/sum)*100):0}));
  };
  const visKeys = activeGrp==="전체" ? Object.keys(CHANNELS) : Object.keys(CHANNELS).filter(k=>CHANNELS[k].group===activeGrp);
  const radarData = Object.keys(CHANNELS).map(key=>({
    subject: CHANNELS[key].label,
    ...Object.fromEntries(BRANDS.map((b,i)=>[b.name, cd[i][key]])),
  }));
  const sourceColor = {simulation:"#555", trends:"#00C4FF", csv:"#00FF87"}[source];
  const sourceLabel = {simulation:"시뮬레이션", trends:"Google Trends", csv:"CSV 업로드"}[source];

  const TABS = [["dashboard","📊 대시보드"],["data","🔌 데이터 연동"],["guide","📋 API 가이드"]];

  return (
    <div style={{ minHeight:"100vh", background:"#0B0F17", color:"#E8EDF5", fontFamily:"'IBM Plex Mono','Courier New',monospace", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box} button{font-family:inherit} ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#1e2530;border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:6, height:30, background:"linear-gradient(180deg,#FF3B5C,#FFBE0B)", borderRadius:3 }} />
          <div>
            <div style={{ fontSize:9, letterSpacing:"0.3em", color:"rgba(255,255,255,0.25)", marginBottom:2 }}>BRAND INTELLIGENCE</div>
            <div style={{ fontSize:17, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>디지털 점유율 모니터</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:sourceColor, boxShadow:`0 0 7px ${sourceColor}`, display:"inline-block" }} />
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.12em" }}>{sourceLabel.toUpperCase()}</span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.18)" }}>{updated.toLocaleTimeString("ko-KR")}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", padding:"0 28px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"11px 18px", background:"none", border:"none", cursor:"pointer", fontSize:12,
            color: tab===id ? "#E8EDF5" : "rgba(255,255,255,0.28)",
            borderBottom: tab===id ? "2px solid #FF3B5C" : "2px solid transparent",
            fontWeight: tab===id ? 600 : 400, letterSpacing:"0.04em",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:"24px 28px", maxWidth:1180, margin:"0 auto" }}>

        {/* ===== DASHBOARD ===== */}
        {tab==="dashboard" && <>
          {/* Brand tabs */}
          <div style={{ display:"flex", gap:9, marginBottom:22, flexWrap:"wrap" }}>
            {BRANDS.map((b,i)=>(
              <button key={b.id} onClick={()=>setSelBrand(i)} style={{
                padding:"7px 18px", borderRadius:6, cursor:"pointer",
                border:`1px solid ${selBrand===i?b.color:"rgba(255,255,255,0.08)"}`,
                background: selBrand===i?`${b.color}18`:"transparent",
                color: selBrand===i?b.color:"rgba(255,255,255,0.35)",
                fontSize:12, fontWeight:700, letterSpacing:"0.05em",
                boxShadow: selBrand===i?`0 0 18px ${b.color}28`:"none", transition:"all .22s",
              }}>{b.icon} {b.name}</button>
            ))}
          </div>

          {/* KPI */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))", gap:11, marginBottom:18 }}>
            {[
              {label:"총 점유율 지수", val:totalScore(selBrand), unit:"", color:BRANDS[selBrand].color},
              {label:"SNS 점유율",    val:groupShare("SNS")[selBrand].value,   unit:"%", color:"#FF3B5C"},
              {label:"검색 점유율",   val:groupShare("검색")[selBrand].value,  unit:"%", color:"#00C4FF"},
              {label:"미디어 점유율", val:groupShare("미디어")[selBrand].value, unit:"%", color:"#FFBE0B"},
            ].map((k,i)=>(
              <Card key={i} style={{ borderTop:`2px solid ${k.color}` }}>
                <MiniLabel color="rgba(255,255,255,0.28)">{k.label.toUpperCase()}</MiniLabel>
                <div style={{ fontSize:26, fontWeight:800, color:k.color, fontFamily:"'Syne',sans-serif" }}>{k.val}{k.unit}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:4 }}>{BRANDS[selBrand].name}</div>
              </Card>
            ))}
          </div>

          {/* Radar + Trend */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Card>
              <MiniLabel>CHANNEL RADAR</MiniLabel>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>채널별 분포</div>
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9 }} />
                  {BRANDS.map(b=>(
                    <Radar key={b.id} name={b.name} dataKey={b.name} stroke={b.color} fill={b.color} fillOpacity={0.07} strokeWidth={2} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:12, marginTop:8, flexWrap:"wrap" }}>
                {BRANDS.map(b=>(
                  <span key={b.id} style={{ fontSize:10, color:b.color, display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:14, height:2, background:b.color, display:"inline-block", borderRadius:2 }} />{b.name}
                  </span>
                ))}
              </div>
            </Card>

            <Card>
              <MiniLabel>TREND · 검색 관심도</MiniLabel>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>월별 추이</div>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={trend}>
                  <XAxis dataKey="month" tick={{ fill:"rgba(255,255,255,0.28)", fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"rgba(255,255,255,0.28)", fontSize:9 }} axisLine={false} tickLine={false} width={26} />
                  <Tooltip contentStyle={{ background:"#0B0F17", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, fontSize:11, color:"#E8EDF5" }} />
                  {BRANDS.map(b=>(
                    <Area key={b.id} type="monotone" dataKey={b.id} name={b.name} stroke={b.color} fill={b.color} fillOpacity={0.07} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Group share */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
            {GROUPS.map(grp=>(
              <Card key={grp}>
                <MiniLabel color={grp==="SNS"?"#FF3B5C":grp==="검색"?"#00C4FF":"#FFBE0B"}>{grp.toUpperCase()} 그룹 점유율</MiniLabel>
                {groupShare(grp).map(s=><BarRow key={s.id} label={s.name} value={s.value} color={s.color} />)}
              </Card>
            ))}
          </div>

          {/* Matrix */}
          <Card>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
              <div>
                <MiniLabel>CHANNEL MATRIX</MiniLabel>
                <div style={{ fontSize:14, fontWeight:700 }}>채널별 상세 점유율</div>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {["전체",...GROUPS].map(g=>(
                  <Pill key={g} color="#FF3B5C" active={activeGrp===g} onClick={()=>setActiveGrp(g)}>{g}</Pill>
                ))}
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:"left", padding:"7px 12px", color:"rgba(255,255,255,0.25)", fontSize:9, letterSpacing:"0.15em", borderBottom:"1px solid rgba(255,255,255,0.06)", fontWeight:600 }}>채널</th>
                    {BRANDS.map(b=>(
                      <th key={b.id} style={{ textAlign:"right", padding:"7px 12px", color:b.color, fontSize:9, borderBottom:"1px solid rgba(255,255,255,0.06)", fontWeight:700 }}>{b.icon} {b.name}</th>
                    ))}
                    <th style={{ textAlign:"right", padding:"7px 12px", color:"rgba(255,255,255,0.25)", fontSize:9, borderBottom:"1px solid rgba(255,255,255,0.06)", fontWeight:600 }}>요기요 점유율</th>
                  </tr>
                </thead>
                <tbody>
                  {visKeys.map(key=>{
                    const shares = channelShare(key);
                    const myShare = shares[0].value;
                    return (
                      <tr key={key} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding:"10px 12px", whiteSpace:"nowrap", color:"rgba(255,255,255,0.55)" }}>
                          <span style={{ marginRight:8 }}>{CHANNELS[key].icon}</span>{CHANNELS[key].label}
                        </td>
                        {BRANDS.map((b,i)=>(
                          <td key={b.id} style={{ textAlign:"right", padding:"10px 12px", color:b.color, fontWeight:700 }}>{cd[i][key]}</td>
                        ))}
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                            <div style={{ flex:1, height:3, background:"rgba(255,255,255,0.06)", borderRadius:2 }}>
                              <div style={{ height:"100%", width:`${myShare}%`, background:"#FF3B5C", borderRadius:2, transition:"width .7s" }} />
                            </div>
                            <span style={{ color:"#FF3B5C", fontWeight:700, minWidth:30, textAlign:"right" }}>{myShare}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>}

        {/* ===== DATA 탭 ===== */}
        {tab==="data" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

            {/* Google Trends */}
            <Card style={{ gridColumn:"1/-1" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14 }}>
                <div>
                  <MiniLabel color="#00C4FF">GOOGLE TRENDS 연동</MiniLabel>
                  <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>검색 관심도 자동 수집</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)", lineHeight:1.8, maxWidth:500 }}>
                    요기요 · 배달의민족 · 쿠팡이츠의 구글 검색 관심도를 3개월치로 조회합니다.<br/>
                    브라우저 CORS 제한으로 직접 호출은 불가하여 <b style={{color:"#FFBE0B"}}>Python 백엔드 프록시</b>가 필요합니다.<br/>
                    아래 버튼은 Trends 근사 시뮬레이션으로 작동합니다.
                  </div>
                </div>
                <button onClick={loadTrends} disabled={loading} style={{
                  padding:"10px 22px", borderRadius:8, border:"1px solid #00C4FF",
                  background:loading?"rgba(0,196,255,0.04)":"rgba(0,196,255,0.1)",
                  color:"#00C4FF", fontSize:12, fontWeight:700, cursor:loading?"not-allowed":"pointer",
                }}>{loading?"불러오는 중…":"🔄 Trends 데이터 로드"}</button>
              </div>
              {status && <div style={{ marginTop:14, padding:"10px 14px", borderRadius:6, background:"rgba(255,255,255,0.04)", fontSize:11, color:"rgba(255,255,255,0.45)" }}>{status}</div>}
              <div style={{ marginTop:16, background:"#080B10", borderRadius:8, padding:16 }}>
                <MiniLabel>PYTHON BACKEND (FastAPI + pytrends)</MiniLabel>
                <pre style={{ fontSize:10, color:"#00FF87", margin:0, overflowX:"auto", lineHeight:1.75 }}>{`from pytrends.request import TrendReq
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])

@app.get("/api/trends")
def trends():
    pt = TrendReq(hl="ko", tz=540)
    pt.build_payload(["요기요","배달의민족","쿠팡이츠"], geo="KR", timeframe="today 3-m")
    return pt.interest_over_time().reset_index().to_dict(orient="records")`}</pre>
              </div>
            </Card>

            {/* CSV 업로드 */}
            <Card>
              <MiniLabel color="#00FF87">CSV 업로드</MiniLabel>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:10 }}>수동 데이터 입력</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)", lineHeight:1.8, marginBottom:14 }}>
                각 채널 수치를 직접 입력한 CSV를 올리면 대시보드에 즉시 반영됩니다.
              </div>
              <div
                onDragOver={e=>e.preventDefault()} onDrop={onDrop}
                onClick={()=>fileRef.current?.click()}
                style={{ border:"1px dashed rgba(0,255,135,0.25)", borderRadius:10, padding:"26px 20px",
                  textAlign:"center", cursor:"pointer", background:"rgba(0,255,135,0.02)", marginBottom:12 }}>
                <div style={{ fontSize:26, marginBottom:6 }}>📂</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>CSV 드래그 또는 클릭</div>
                <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} onChange={e=>handleCSV(e.target.files[0])} />
              </div>
              {csvErr && <div style={{ fontSize:11, color:"#FF3B5C", marginBottom:8 }}>⚠️ {csvErr}</div>}
              <div style={{ background:"#080B10", borderRadius:8, padding:14 }}>
                <MiniLabel>CSV 형식 예시</MiniLabel>
                <pre style={{ fontSize:10, color:"#FFBE0B", margin:0, lineHeight:1.75 }}>{`브랜드,인스타그램,유튜브,틱톡,네이버,구글,커뮤니티,미디어
요기요,42,31,25,38,33,35,30
배달의민족,48,44,41,50,46,52,48
쿠팡이츠,19,33,43,19,28,20,28`}</pre>
              </div>
              <button onClick={()=>{
                const csv=`브랜드,인스타그램,유튜브,틱톡,네이버,구글,커뮤니티,미디어\n요기요,42,31,25,38,33,35,30\n배달의민족,48,44,41,50,46,52,48\n쿠팡이츠,19,33,43,19,28,20,28`;
                const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
                a.download="brand_share_template.csv"; a.click();
              }} style={{ marginTop:11, width:"100%", padding:"9px", borderRadius:8,
                border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.03)",
                color:"rgba(255,255,255,0.4)", fontSize:11, cursor:"pointer" }}>
                ⬇ 템플릿 CSV 다운로드
              </button>
            </Card>

            {/* API 상태 */}
            <Card>
              <MiniLabel color="#FFBE0B">공식 API 연동 현황</MiniLabel>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>플랫폼별 API 가용성</div>
              {[
                {p:"YouTube Data API v3",    s:"🟡 API 키 필요",          c:"#FFBE0B", d:"구독자·조회수"},
                {p:"Instagram Graph API",    s:"🟡 비즈니스 계정 필요",  c:"#FFBE0B", d:"팔로워·도달"},
                {p:"Naver DataLab API",      s:"🟡 오픈API 신청",         c:"#FFBE0B", d:"검색 관심도"},
                {p:"Google Search Console",  s:"🟡 소유자 인증 필요",     c:"#FFBE0B", d:"구글 노출량"},
                {p:"TikTok Research API",    s:"🔴 기업 파트너 전용",      c:"#FF3B5C", d:"해시태그 조회수"},
              ].map(api=>(
                <div key={api.p} style={{ marginBottom:13, paddingBottom:13, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:600 }}>{api.p}</span>
                    <span style={{ fontSize:10, color:api.c }}>{api.s}</span>
                  </div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{api.d}</div>
                </div>
              ))}
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.2)" }}>상세 발급 방법 → API 가이드 탭</div>
            </Card>
          </div>
        )}

        {/* ===== API GUIDE 탭 ===== */}
        {tab==="guide" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[
              { title:"① YouTube Data API v3", color:"#FF3B5C",
                steps:["Google Cloud Console → 새 프로젝트 생성","API 라이브러리 → YouTube Data API v3 활성화","사용자 인증 정보 → API 키 생성","채널 ID로 통계 조회"],
                code:`GET https://www.googleapis.com/youtube/v3/channels
  ?part=statistics
  &id={CHANNEL_ID}
  &key={API_KEY}

// 반환: subscriberCount, viewCount, videoCount` },
              { title:"② Naver DataLab API", color:"#00C4FF",
                steps:["developers.naver.com → 애플리케이션 등록","'검색어 트렌드' 사용 신청","Client ID / Client Secret 발급","최근 1년 월별 검색량 조회"],
                code:`POST https://openapi.naver.com/v1/datalab/search
X-Naver-Client-Id: {CLIENT_ID}
X-Naver-Client-Secret: {SECRET}
{
  "startDate":"2024-01-01","endDate":"2024-04-22",
  "timeUnit":"month",
  "keywordGroups":[
    {"groupName":"요기요","keywords":["요기요"]}
  ]
}` },
              { title:"③ Google Search Console API", color:"#FFBE0B",
                steps:["Search Console 도메인 소유권 인증","Cloud Console → Search Console API 활성화","OAuth 2.0 인증 후 액세스 토큰 발급","쿼리·클릭·노출 데이터 조회"],
                code:`POST https://searchconsole.googleapis.com/v1/sites/
  {siteUrl}/searchAnalytics/query
Authorization: Bearer {ACCESS_TOKEN}
{
  "startDate":"2024-01-01","endDate":"2024-04-22",
  "dimensions":["query"],"rowLimit":10
}` },
              { title:"④ Instagram Graph API", color:"#FF3B5C",
                steps:["Meta Developers → 비즈니스 앱 생성","Instagram Graph API 추가","비즈니스 Instagram 계정 연결","팔로워·도달·노출 조회"],
                code:`GET https://graph.instagram.com/me/insights
  ?metric=reach,impressions,follower_count
  &period=month
  &access_token={ACCESS_TOKEN}` },
            ].map(api=>(
              <Card key={api.title}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22, flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:api.color, marginBottom:14, fontFamily:"'Syne',sans-serif" }}>{api.title}</div>
                    <ol style={{ margin:0, padding:"0 0 0 16px", color:"rgba(255,255,255,0.5)", fontSize:12, lineHeight:2.1 }}>
                      {api.steps.map((s,i)=><li key={i}>{s}</li>)}
                    </ol>
                  </div>
                  <div style={{ background:"#080B10", borderRadius:8, padding:14 }}>
                    <MiniLabel>SAMPLE REQUEST</MiniLabel>
                    <pre style={{ fontSize:10, color:api.color, margin:0, lineHeight:1.75, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>{api.code}</pre>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
