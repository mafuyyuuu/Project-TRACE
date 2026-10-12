const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>(Number(value)/100).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
/** Print only the saved issue snapshot. The photo defines relative layout, not measured printer geometry. */
export function receiptHtml(snapshot,config,mode='full') {
 const width=Number(config.width_mm),height=Number(config.height_mm),margin=Number(config.margin_mm),x=Number(config.offset_x_mm),y=Number(config.offset_y_mm);
 if(![width,height,margin,x,y].every(Number.isFinite))throw new Error('Invalid paper calibration.');
 const dataOnly=mode==='data-only';
 const blankRows=Array.from({length:Math.max(0,8-snapshot.items.length)},()=>'<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>').join('');
 const rows=snapshot.items.map(item=>`<tr><td>${escape(item.document_type)}</td><td>${escape(item.fund_code)}</td><td>${escape(item.account_code)}</td><td class="money">${money(item.amount_centavos)}</td></tr>`).join('');
 return `<!doctype html><html><head><meta charset="utf-8"><title>Official Receipt ${escape(snapshot.serial)}</title><style>
 @page{size:${width}mm ${height}mm;margin:${margin}mm}*{box-sizing:border-box}body{margin:0;color:#111;background:white;font:11pt Arial,sans-serif}.paper{position:relative;width:${width-2*margin}mm;height:${height-2*margin}mm;transform:translate(${x}mm,${y}mm)}.field{position:absolute;left:4%;right:4%;overflow-wrap:anywhere}.header{top:3%;text-align:center;color:#173b68;font-size:12pt}.header strong{display:block;font-size:17pt}.date{top:18%;left:4%;right:52%}.serial{top:18%;left:54%;right:4%;text-align:right}.payor{top:24%;line-height:1.55}.collection{top:34%;height:30%}table{width:100%;height:100%;border-collapse:collapse;font-size:${snapshot.items.length>6?'8':'10'}pt}td,th{padding:4px;text-align:left;vertical-align:top;border:1px solid #68798c}th{font-size:9pt}.money{text-align:right;white-space:nowrap}.total{top:65%;text-align:right}.words{top:71%;font-size:10pt}.reference{top:80%;font-size:10pt}.cashier{top:87%;left:45%;text-align:center}.label{font-size:9pt;color:#455368}.footer{top:96%;font-size:8pt}.data-only .static{visibility:hidden}.data-only td,.data-only th{border-color:transparent}.data-only{color:black}@media screen{body{padding:15px;background:#eef2f0}.paper{background:white;box-shadow:0 3px 18px #0002;margin:0 auto}}
 </style></head><body class="${dataOnly?'data-only':''}"><main class="paper">
 <div class="field header static">Republic of the Philippines<strong>OFFICIAL RECEIPT</strong>City of Pasig · Treasurer's Office<br><small>Defense layout preview — synthetic/demo use</small></div>
 <div class="field date"><span class="label static">Date</span><br>${escape(snapshot.issue_date)}</div><div class="field serial"><span class="label static">Issuance No.</span><br><strong>${escape(snapshot.serial)}</strong></div>
 <div class="field payor"><span class="label static">Payor</span><br>${escape(snapshot.student_id)}<br><strong>${escape(snapshot.payor_name)}</strong></div>
 <div class="field collection"><table><thead class="static"><tr><th>Nature of Collection</th><th>Fund</th><th>Account</th><th>Amount</th></tr></thead><tbody>${rows}${blankRows}</tbody></table></div>
 <div class="field total"><span class="static">TOTAL </span><strong>${money(snapshot.total_centavos)}</strong></div>
 <div class="field words"><span class="label static">Amount in words</span><br>${escape(snapshot.amount_words)}</div>
 <div class="field reference"><span class="label static">Payment reference</span><br>${escape(snapshot.payment_reference || '')}</div>
 <div class="field cashier"><strong>${escape(snapshot.cashier_name)}</strong><br><span class="label static">Cashier / Collecting Officer</span></div>
 <div class="field footer static">Printer alignment requires calibration against the actual blank paper.</div>
 </main></body></html>`;
}
