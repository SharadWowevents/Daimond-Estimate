import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// Constants
const CHALNI_LABELS = [
  "-14", "14-18", "18-24", "24-27", "27-35", "40P", "50P", "60P", 
  "70P", "80P", "90P", "1CT", "1.00-1.50", "1.50-2.00", "2.00-3.00"
];
const DEFAULT_RATES = [4500, 6700, 8700, 11500, 13600, 23500, 26000, 28000, 32500, 35900, 39800, 42500, 48000, 58000, 67500];

const INITIAL_DRAFT = {
  tag: "", code: "", date: new Date().toISOString().slice(0, 10), karat: "14K",
  gross: "", net: "", netpct: 60, wastewt: "", wastepct: 100, goldmargin: 0,
  dia_wt: "", dia_rate: 14000, rcep_wt: "", rcep_rate: 0, other_wt: "", other_rate: 0,
  cs_wt: "", cs_rate: 150, lab_rate: 1350, piroi: "",
  marginbase: "stone", margin: 7, discount: "",
  chalni_wt: Array(15).fill(""),
  chalni_rate: [...DEFAULT_RATES]
};

const SAMPLE_DRAFT = {
  ...INITIAL_DRAFT,
  tag: "NS144", code: "800", karat: "14K",
  gross: "80.200", net: "45.770", wastewt: "4.680",
  dia_wt: "13.05", cs_wt: "60.42",
  chalni_wt: ["0", "2.15", "3.21", "0", "2.88", "0", "0", "0", "0", "0", "0.9", "0", "0", "0", "0"]
};

const INITIAL_PRICE_LISTS = [
  { name: "List RW", rates: [...DEFAULT_RATES] },
  { name: "List RB", rates: [...DEFAULT_RATES] },
  { name: "List Wholesale", rates: [...DEFAULT_RATES] },
  { name: "List D", rates: [...DEFAULT_RATES] }
];

// Helper Math Functions
const toNum = (val) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};
const rupee = (num) => "₹" + Math.round(num).toLocaleString("en-IN");
const wt2 = (num) => num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wt3 = (num) => num.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function App() {
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [photo, setPhoto] = useState("");
  const [priceLists, setPriceLists] = useState(INITIAL_PRICE_LISTS);
  const [activeListIndex, setActiveListIndex] = useState(0);
  const [activeListName, setActiveListName] = useState("List RW");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("rel-draft");
      const savedPhoto = localStorage.getItem("rel-photo");
      const savedLists = localStorage.getItem("rel-pricelists");
      
      if (savedDraft) setDraft(JSON.parse(savedDraft));
      if (savedPhoto) setPhoto(savedPhoto);
      if (savedLists) {
        const parsed = JSON.parse(savedLists);
        setPriceLists(parsed);
        setActiveListName(parsed[0].name);
      }
    } catch (e) { console.error("Could not load save data"); }
  }, []);

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    localStorage.setItem("rel-draft", JSON.stringify(draft));
    localStorage.setItem("rel-photo", photo);
  }, [draft, photo]);

  // Standard input handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setDraft(prev => ({ ...prev, [name]: value }));
  };

  // Chalni Table specific handlers
  const handleChalniChange = (index, field, value) => {
    const newArray = [...draft[field]];
    newArray[index] = value;
    setDraft(prev => ({ ...prev, [field]: newArray }));
  };

  // Image Processor (Canvas resizing)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !/^image\//.test(file.type)) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        setPhoto(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPhoto("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Price List Handlers
  const applyPriceList = (index) => {
    if (index === -1) {
      // "Create new" selected
      setActiveListIndex(-1);
      setActiveListName(""); 
      // Keep current draft.chalni_rate so user can save them as a new list
    } else {
      // Existing list selected
      setActiveListIndex(index);
      setActiveListName(priceLists[index].name);
      setDraft(prev => ({ ...prev, chalni_rate: [...priceLists[index].rates] }));
    }
  };

  const saveCurrentRatesToActiveList = () => {
    const newLists = [...priceLists];
    const savedName = activeListName.trim() || `New List ${newLists.length + 1}`;

    if (activeListIndex === -1) {
      // Add a completely new list to the array
      newLists.push({
        name: savedName,
        rates: [...draft.chalni_rate]
      });
      // Point index to the newly created list
      setActiveListIndex(newLists.length - 1);
      setActiveListName(savedName);
    } else {
      // Update existing list
      newLists[activeListIndex] = {
        name: savedName,
        rates: [...draft.chalni_rate]
      };
      setActiveListName(savedName); // Sync name in case it was modified
    }

    setPriceLists(newLists);
    localStorage.setItem("rel-pricelists", JSON.stringify(newLists));
    
    setToast("Rates saved!");
    setTimeout(() => setToast(""), 2000);
  };

  // Toolbar Actions
  const loadSample = () => setDraft(SAMPLE_DRAFT);
  const resetEstimate = () => { setDraft(INITIAL_DRAFT); removeImage(); };
  
  // Custom Print Function for Unique PDF Name
  const printPage = () => {
    const originalTitle = document.title;
    
    // Generate timestamp
    const now = new Date();
    const timeStr = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
    
    // Create unique file name, filtering out empty fields
    const fileName = [
      draft.tag,
      draft.code,
      draft.date,
      draft.karat,
      timeStr
    ].filter(Boolean).join("_");
    
    // Temporarily set document title to the new file name
    document.title = fileName || "Rough_Estimate_Ledger";
    
    window.print();
    
    // Restore the original title shortly after
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // ================== MATH / CALCULATIONS ==================
  
  // Gold Calculations
  const gross = toNum(draft.gross);
  const net = toNum(draft.net);
  const netpct = toNum(draft.netpct);
  const wastewt = toNum(draft.wastewt);
  const wastepct = toNum(draft.wastepct);
  
  const netFine = net * (netpct / 100);
  const wasteFine = wastewt * (wastepct / 100);
  const fineSub = netFine + wasteFine;
  const totalFine = fineSub + (fineSub * toNum(draft.goldmargin) / 100);

  // Chalni Array Calculations
  let chTotWt = 0;
  let chTotAmt = 0;
  const chalniRows = CHALNI_LABELS.map((label, i) => {
    const w = toNum(draft.chalni_wt[i]);
    const r = toNum(draft.chalni_rate[i]);
    const amt = Math.round(w * r);
    chTotWt += w;
    chTotAmt += amt;
    return { label, wt: w, rawWt: draft.chalni_wt[i], rawRate: draft.chalni_rate[i], amt };
  });
  const chAvgRate = chTotWt > 0 ? chTotAmt / chTotWt : 0;

  // Stones & Labour
  const diaAmt = Math.round(toNum(draft.dia_wt) * toNum(draft.dia_rate));
  const rcepAmt = Math.round(toNum(draft.rcep_wt) * toNum(draft.rcep_rate));
  const otherAmt = Math.round(toNum(draft.other_wt) * toNum(draft.other_rate));
  const csAmt = Math.round(toNum(draft.cs_wt) * toNum(draft.cs_rate));
  
  const labWt = net + wastewt; // Labour applied to Gold Net + Kundan wastage
  const labAmt = Math.round(labWt * toNum(draft.lab_rate));
  const piroiAmt = Math.round(toNum(draft.piroi));

  // Totals
  const stoneTotal = chTotAmt + diaAmt + rcepAmt + otherAmt + csAmt;
  const costingSubtotal = stoneTotal + labAmt + piroiAmt;
  
  const marginBaseAmt = draft.marginbase === "full" ? costingSubtotal : stoneTotal;
  const marginAmt = Math.round(marginBaseAmt * (toNum(draft.margin) / 100));
  
  const grandTotal = costingSubtotal + marginAmt - toNum(draft.discount);

  // Hidden Code logic
  const codeValue = toNum(draft.code) * 1000;
  const discodeText = codeValue > 0 ? ((grandTotal / codeValue) * 100).toFixed(2) + "%" : "—";


  return (
    <div className="sheet">
      <div className="plate">
        <div className="plate-title">
          <h1>Rough Estimate Ledger</h1>
          <span className="kicker">Polki &amp; Diamond Costing</span>
        </div>
        <div className="plate-fields">
          <div className="pf">
            <label>Tag No.</label>
            <input name="tag" value={draft.tag} onChange={handleChange} placeholder="e.g. NS144" />
          </div>
          <div className="pf">
            <label>Code</label>
            <input type="number" name="code" value={draft.code} onChange={handleChange} placeholder="e.g. 800" />
          </div>
          <div className="pf">
            <label>Date</label>
            <input type="date" name="date" value={draft.date} onChange={handleChange} />
          </div>
          <div className="pf">
            <label>Karat</label>
            <select name="karat" value={draft.karat} onChange={handleChange}>
              <option>10K</option><option>14K</option><option>18K</option><option>22K</option>
            </select>
          </div>
        </div>

        <div className={`plate-photo ${photo ? 'has-photo' : ''}`}>
          <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImageUpload} />
          <div className="photo-frame" onClick={() => fileInputRef.current.click()}>
            {photo ? <img src={photo} alt="Jewelry Item" /> : <span className="photo-plus">+</span>}
          </div>
          {photo && <button type="button" className="photo-remove-btn" onClick={removeImage}>×</button>}
        </div>
      </div>

      <div className="toolbar no-print">
        <button className="btn primary" onClick={resetEstimate}>New estimate</button>
        <button className="btn" onClick={loadSample}>Load sample</button>
        <button className="btn" onClick={printPage}>Print / save as PDF</button>
      </div>

      <div className="section">
        <div className="section-head">
          <span className="idx">01</span>
          <h2>Costing</h2>
          <span className="hint">gold weight · stone &amp; labour value</span>
        </div>

        <div className="grid2">
          {/* ---- GOLD PANEL ---- */}
          <div className="panel">
            <div className="panel-title">Fine gold weight</div>
            <table className="rows">
              <tbody>
                <tr>
                  <td className="lbl">Gross Wt</td>
                  <td><input type="number" name="gross" value={draft.gross} onChange={handleChange} placeholder="0" /></td>
                  <td className="unit">gms</td>
                </tr>
                <tr>
                  <td className="lbl">Net Wt</td>
                  <td><input type="number" name="net" value={draft.net} onChange={handleChange} placeholder="0" /></td>
                  <td className="unit">gms</td>
                </tr>
                <tr>
                  <td className="lbl">— conversion</td>
                  <td><input type="number" name="netpct" value={draft.netpct} onChange={handleChange} /></td>
                  <td className="unit">%</td>
                </tr>
                <tr className="computed">
                  <td className="lbl">Net fine gold</td>
                  <td className="amt num">{wt3(netFine)}</td>
                  <td className="unit">gms</td>
                </tr>
                <tr>
                  <td className="lbl">Kundan Wt <span className="sub">with wastage</span></td>
                  <td><input type="number" name="wastewt" value={draft.wastewt} onChange={handleChange} placeholder="0" /></td>
                  <td className="unit">gms</td>
                </tr>
                <tr>
                  <td className="lbl">— conversion</td>
                  <td><input type="number" name="wastepct" value={draft.wastepct} onChange={handleChange} /></td>
                  <td className="unit">%</td>
                </tr>
                <tr className="total">
                  <td className="lbl">Fine subtotal</td>
                  <td className="amt num">{wt3(fineSub)}</td>
                  <td className="unit">gms</td>
                </tr>
                <tr>
                  <td className="lbl">Margin</td>
                  <td><input type="number" name="goldmargin" value={draft.goldmargin} onChange={handleChange} /></td>
                  <td className="unit">%</td>
                </tr>
                <tr className="grandtotal">
                  <td className="lbl">Total fine gold</td>
                  <td className="amt num">{wt3(totalFine)}</td>
                  <td className="unit">gms</td>
                </tr>
              </tbody>
            </table>
            <div className="note">Priced separately — total fine weight × day's rate is not included below.</div>
          </div>

          {/* ---- STONES & LABOUR PANEL ---- */}
          <div className="panel">
            <div className="panel-title">Stone &amp; labour value</div>
            <table className="rows">
              <tbody>
                <tr className="headrow"><td></td><td>Wt</td><td>Rate</td><td>Amount</td></tr>
                <tr className="linked">
                  <td className="lbl">Polki <span className="sub">from sizing ledger</span></td>
                  <td className="amt num">{wt2(chTotWt)} cts</td>
                  <td className="amt num">{rupee(chAvgRate)}</td>
                  <td className="amt num">{rupee(chTotAmt)}</td>
                </tr>
                <tr>
                  <td className="lbl">Diamonds</td>
                  <td><input type="number" name="dia_wt" value={draft.dia_wt} onChange={handleChange} placeholder="0 cts" /></td>
                  <td><input type="number" name="dia_rate" value={draft.dia_rate} onChange={handleChange} /></td>
                  <td className="amt num">{rupee(diaAmt)}</td>
                </tr>
                <tr>
                  <td className="lbl">RC / EP</td>
                  <td><input type="number" name="rcep_wt" value={draft.rcep_wt} onChange={handleChange} placeholder="0 cts" /></td>
                  <td><input type="number" name="rcep_rate" value={draft.rcep_rate} onChange={handleChange} /></td>
                  <td className="amt num">{rupee(rcepAmt)}</td>
                </tr>
                <tr>
                  <td className="lbl">Other Wt</td>
                  <td><input type="number" name="other_wt" value={draft.other_wt} onChange={handleChange} placeholder="0 cts" /></td>
                  <td><input type="number" name="other_rate" value={draft.other_rate} onChange={handleChange} /></td>
                  <td className="amt num">{rupee(otherAmt)}</td>
                </tr>
                <tr>
                  <td className="lbl">Colour stones <span className="sub">CS</span></td>
                  <td><input type="number" name="cs_wt" value={draft.cs_wt} onChange={handleChange} placeholder="0 cts" /></td>
                  <td><input type="number" name="cs_rate" value={draft.cs_rate} onChange={handleChange} /></td>
                  <td className="amt num">{rupee(csAmt)}</td>
                </tr>
                <tr className="linked">
                  <td className="lbl">Labour <span className="sub">Net Wt + Kundan Wt</span></td>
                  <td className="amt num">{wt3(labWt)} gms</td>
                  <td><input type="number" name="lab_rate" value={draft.lab_rate} onChange={handleChange} /></td>
                  <td className="amt num">{rupee(labAmt)}</td>
                </tr>
                <tr>
                  <td className="lbl">Piroi charges</td>
                  <td></td><td></td>
                  <td><input type="number" name="piroi" value={draft.piroi} onChange={handleChange} placeholder="0" style={{textAlign: "right"}} /></td>
                </tr>
                <tr className="total">
                  <td className="lbl">Costing</td>
                  <td></td><td></td>
                  <td className="amt num">{rupee(costingSubtotal)}</td>
                </tr>
                <tr>
                  <td className="lbl">Margin</td>
                  <td>
                    <select name="marginbase" value={draft.marginbase} onChange={handleChange} style={{ font: "inherit", fontFamily: "'IBM Plex Mono', monospace", fontSize: "11.5px", border: "none", borderBottom: "1px dashed var(--line-strong)", background: "transparent", color: "var(--ink-soft)", width: "100%" }}>
                      <option value="stone">on stone value</option>
                      <option value="full">on full costing</option>
                    </select>
                  </td>
                  <td><input type="number" name="margin" value={draft.margin} onChange={handleChange} style={{textAlign: "right"}} /></td>
                  <td className="amt num">{rupee(marginAmt)}</td>
                </tr>
                <tr>
                  <td className="lbl">Discount</td>
                  <td></td><td></td>
                  <td><input type="number" name="discount" value={draft.discount} onChange={handleChange} placeholder="0" style={{textAlign: "right"}} /></td>
                </tr>
                <tr className="grandtotal">
                  <td className="lbl">Total (excl. gold)</td>
                  <td></td><td></td>
                  <td className="amt num">{rupee(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---- CHALNI SIZING PANEL ---- */}
      <div className="section page-break">
        <div className="section-head">
          <span className="idx">02</span>
          <h2>Polki sizing ledger</h2>
          <span className="hint">chalni-wise weight &amp; rate</span>
        </div>

        <div className="pricelist-bar no-print">
          <div className="pf" style={{ minWidth: "150px" }}>
            <label>Price list</label>
            <select value={activeListIndex} onChange={(e) => applyPriceList(Number(e.target.value))}>
              {priceLists.map((list, i) => (
                <option key={i} value={i}>{list.name}</option>
              ))}
              <option value={-1}>-- Create new --</option>
            </select>
          </div>
          <div className="pf" style={{ minWidth: "170px" }}>
            <label>List name</label>
            <input type="text" value={activeListName} onChange={(e) => setActiveListName(e.target.value)} placeholder="Type new list name..." />
          </div>
          <button className="btn" type="button" onClick={saveCurrentRatesToActiveList}>Save current rates to list</button>
          <span className="hint" style={{ marginLeft: 0 }}>{toast}</span>
        </div>

        <div className="panel" style={{ padding: "6px 4px", overflowX: "auto" }}>
          <table className="sizing">
            <thead>
              <tr><th>Chalni</th><th>Wt (cts)</th><th>List rate ₹/ct</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {chalniRows.map((row, i) => (
                <tr key={i} className={row.wt === 0 ? "zero" : ""}>
                  <td>{row.label}</td>
                  <td><input type="number" value={row.rawWt} onChange={(e) => handleChalniChange(i, "chalni_wt", e.target.value)} placeholder="0" /></td>
                  <td><input type="number" value={row.rawRate} onChange={(e) => handleChalniChange(i, "chalni_rate", e.target.value)} /></td>
                  <td className="amt num">{rupee(row.amt)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="amt num">{wt2(chTotWt)}</td>
                <td className="amt num">{rupee(chAvgRate)}</td>
                <td className="amt num">{rupee(chTotAmt)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ---- SUMMARY STAMP ---- */}
      <div className="stamp">
        <div className="stamp-left">
          <div className="stamp-row"><span className="k">Discount</span><span className="v num">{rupee(toNum(draft.discount))}</span></div>
          <div className="stamp-row highlight"><span className="k">Total (excl. gold)</span><span className="v num">{rupee(grandTotal)}</span></div>
          <div className="stamp-row highlight"><span className="k">Total fine gold</span><span className="v num">{wt3(totalFine)} gms</span></div>
          <div className="stamp-row discode no-print">
            <span className="k">Dis on Code <span className="sub">Total ÷ (Code×1000)</span></span>
            <span className="v num">{discodeText}</span>
          </div>
        </div>
      </div>
      
      <footer className="foot no-print">Rough Estimate Ledger — all data is stored locally in your browser.</footer>
    </div>
  );
}