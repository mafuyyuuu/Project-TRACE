const fs = require('fs');
const path = 'frontend/src/features/student/components/LiveTrackingModal.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldHtml = `{/* Horizontal Map Visualizer */}
      <div className="px-4 py-6 flex flex-col justify-center w-full bg-white rounded-2xl border border-gray-100 shadow-sm">`;

const newHtml = `{/* Horizontal Map Visualizer (Desktop) */}
      <div className="hidden md:flex px-4 py-6 flex-col justify-center w-full bg-white rounded-2xl border border-gray-100 shadow-sm">`;

content = content.replace(oldHtml, newHtml);

const endHtml = `        </div>
      </div>

      {/* Context Panel */}`;

const mobileHtml = `        </div>
      </div>

      {/* Snake Visualizer (Mobile) */}
      <div className="md:hidden px-2 py-4 flex flex-col w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="relative w-full flex flex-col gap-14">
          {/* S-Curve lines - calculated precisely for a 3x3 grid */}
          <div className="absolute top-3.5 left-[16.66%] right-[16.66%] h-0 border-t-2 border-gray-200 z-0"></div>
          <div className="absolute top-3.5 right-[16.66%] w-[33.33%] h-[4.5rem] border-r-2 border-t-2 border-gray-200 rounded-tr-[2rem] z-0"></div>
          
          <div className="absolute top-[4.5rem] left-[16.66%] right-[16.66%] h-0 border-t-2 border-gray-200 z-0"></div>
          <div className="absolute top-[4.5rem] right-[16.66%] w-[33.33%] h-[4.5rem] border-r-2 border-b-2 border-gray-200 rounded-br-[2rem] z-0"></div>

          <div className="absolute top-[4.5rem] left-[16.66%] w-[33.33%] h-[4.5rem] border-l-2 border-b-2 border-gray-200 rounded-bl-[2rem] z-0"></div>
          <div className="absolute top-[9rem] left-[16.66%] w-[33.33%] h-[4.5rem] border-l-2 border-t-2 border-gray-200 rounded-tl-[2rem] z-0"></div>
          <div className="absolute top-[9rem] left-[16.66%] right-[16.66%] h-0 border-t-2 border-gray-200 z-0"></div>

          {[0, 1, 2].map((rowIndex) => (
            <div key={rowIndex} className={\`relative z-10 flex justify-between w-full \${rowIndex === 1 ? 'flex-row-reverse' : 'flex-row'}\`}>
              {[0, 1, 2].map((colIndex) => {
                const index = rowIndex * 3 + colIndex;
                const node = TRACKER_NODES[index];
                if (!node) return null;

                const rawIndex = PIPELINE.indexOf(selectedDoc.current_status);
                const currentIndex = rawIndex === -1 ? 0 : rawIndex;
                const isReleased = selectedDoc.current_status === STATUS.COMPLETED;
                const isCompleted = index < currentIndex || (index === TRACKER_NODES.length - 1 && isReleased);
                const isActive = index === currentIndex && !isReleased;

                let exactTime = null;
                if (selectedDoc.step_logs && selectedDoc.step_logs.length > 0) {
                  if (index === 0) exactTime = new Date(selectedDoc.created_at);
                  else {
                    const log = selectedDoc.step_logs.find(l => l.to_status === node.key);
                    if (log && log.timestamp_completed) exactTime = new Date(log.timestamp_completed);
                    else if (log && log.timestamp_started) exactTime = new Date(log.timestamp_started);
                  }
                } else {
                  if (index === 0) exactTime = new Date(selectedDoc.created_at);
                  else if (isCompleted) exactTime = new Date(selectedDoc.updated_at);
                }

                return (
                  <div key={node.step} className="relative flex flex-col items-center w-1/3">
                    {isActive && <span className="absolute -top-1 w-8 h-8 bg-blue-400/50 rounded-full animate-ping"></span>}

                    <div className={\`relative z-10 w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border-2 transition-all
                      \${isCompleted ? 'bg-[#15803d] border-[#15803d] text-white shadow-md' :
                        isActive ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)] scale-110' :
                        'bg-white border-gray-200 text-gray-400 shadow-sm'}\`}>
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      ) : isActive ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                      ) : node.step}
                    </div>

                    <div className={\`mt-1.5 text-[9px] font-black uppercase tracking-wider text-center w-full break-words
                      \${isCompleted ? 'text-gray-900' : isActive ? 'text-blue-600' : 'text-gray-400'}\`}>
                      <div>{node.label}</div>
                      {isActive && <div className="text-[6px] animate-pulse mt-0.5 tracking-widest text-blue-400">In Progress</div>}
                      {(isCompleted || isActive) && exactTime && (
                        <div className="mt-0.5 text-[7px] font-bold text-gray-500 lowercase flex flex-col items-center leading-tight">
                          <span>{exactTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
                          <span>{exactTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Context Panel */}`;

content = content.replace(endHtml, mobileHtml);

fs.writeFileSync(path, content);
console.log('Patch applied successfully.');
