import { useEffect, useRef, useState } from 'react';
import { Scene } from './components/Scene';
import { Sidebar } from './components/Sidebar';
import { useGraphStore } from './store/useGraphStore';
import { Undo2, Redo2, Plus, Download, Upload, Code } from 'lucide-react';
import { CodeView } from './components/CodeView';

function App() {
  const {
    addNode,
    importGraph,
    nodes,
    options,
    toggleOption
  } = useGraphStore();

  const [showCodeView, setShowCodeView] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        useGraphStore.temporal.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        useGraphStore.temporal.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExport = () => {
    const data = nodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {} as Record<string, any>);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skillgraph.json';
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        importGraph(data);
      } catch (err) {
        console.error("Failed to parse JSON", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-[#111] text-white">
      {/* Toolbar */}
      <div className="h-14 border-b border-gray-800 flex items-center px-4 justify-between bg-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <img src="/logo.svg" alt="SkillGraph Logo" className="w-8 h-8" />
            <span className="font-bold text-lg hidden md:block">SkillGraph Editor</span>
          </div>
          <div className="h-6 w-px bg-gray-700 mx-2" />
          <div className="flex items-center gap-2 mr-4">
            <Undo2 className="w-5 h-5 cursor-pointer hover:text-blue-400" onClick={() => useGraphStore.temporal.getState().undo()} />
            <Redo2 className="w-5 h-5 cursor-pointer hover:text-blue-400" onClick={() => useGraphStore.temporal.getState().redo()} />
          </div>

          <button
            onClick={addNode}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Node
          </button>

          <div className="h-6 w-px bg-gray-700 mx-2" />

          <button
            onClick={() => toggleOption('snap')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${options.snap ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Snap
          </button>

          <button
            onClick={() => toggleOption('glow')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${options.glow ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Glow
          </button>

          <button
            onClick={() => toggleOption('showNames')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${options.showNames ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Names
          </button>
        </div>



        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCodeView(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            <Code className="w-4 h-4" /> Code
          </button>
          <div className="h-6 w-px bg-gray-700 mx-2" />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>
      <Scene />
      <Sidebar />
      <CodeView
        isOpen={showCodeView}
        onClose={() => setShowCodeView(false)}
        data={nodes.reduce((acc, node) => {
          acc[node.id] = node;
          return acc;
        }, {} as Record<string, any>)}
      />


      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/70 p-3 rounded text-white text-xs pointer-events-none z-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#00ff00]"></div> Requires (AND)
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#ffaa00]"></div> Or Requires (OR)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff0000]"></div> Conflicts
        </div>
      </div>
    </div >
  );
}

export default App;
