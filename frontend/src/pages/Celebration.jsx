import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { Award, ChevronLeft } from 'lucide-react';

export default function Celebration() {
    const location = useLocation();
    const navigate = useNavigate();
    const subjectName = location.state?.subjectName || "the Subject";
    
    // Window size for Confetti
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden m-0 absolute inset-0 z-[100]">
            <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={900}
                gravity={0.12}
            />
            
            <div className="z-10 bg-white/10 backdrop-blur-xl border border-white/20 p-12 rounded-3xl shadow-2xl max-w-lg w-full animate-in zoom-in duration-500">
                <div className="mx-auto bg-gradient-to-br from-yellow-400 to-amber-600 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <Award className="w-12 h-12 text-white" />
                </div>
                
                <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
                    Congratulations!
                </h1>
                
                <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                    You have successfully conquered all units and mastered <br/>
                    <span className="text-2xl font-bold text-yellow-400 mt-3 block">{subjectName}</span>
                </p>
                
                <button
                    onClick={() => navigate('/subjects')}
                    className="inline-flex items-center px-6 py-3 bg-white text-slate-900 rounded-full font-bold text-sm tracking-wide hover:bg-slate-100 transition-all hover:scale-105 shadow-lg"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Return to Subjects
                </button>
            </div>
            
            {/* Ambient Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        </div>
    );
}
