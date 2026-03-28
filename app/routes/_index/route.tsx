import { useState, Fragment } from 'react';
import { LinksFunction, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { odeApi, ODETask, SolutionDetails } from '~/services/api';

// Parse the LaTeX solution into steps
const parseLatexSolution = (latex: string): { title: string; prose: string; math: string[] }[] => {
    const steps: { title: string; prose: string; math: string[] }[] = [];
    const stepPattern = /Step \d+:|Answer/g;
    const matches = [...latex.matchAll(stepPattern)];
    
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = matches[i + 1]?.index || latex.length;
        const content = latex.slice(start, end);
        
        const titleMatch = content.match(/(Step \d+:.*?|Answer)([\s\S]*)/);
        if (titleMatch) {
            const title = titleMatch[1].trim();
            const rest = titleMatch[2] || '';
            
            // Split prose and math
            const mathMatches = [...rest.matchAll(/\$\$([\s\S]*?)\$\$/g)];
            const mathBlocks = mathMatches.map(m => m[1].trim());
            
            // Remove math from prose
            let prose = rest.replace(/\$\$[\s\S]*?\$\$/g, '').trim();
            
            steps.push({ title, prose, math: mathBlocks });
        }
    }
    
    return steps;
};

export const loader = ({ request }: LoaderFunctionArgs) => {
    return { canonicalUrl: new URL(request.url).origin };
};

export default function SimpleHomePage() {
    // State for matrix coefficients (4x4 = 16 values)
    const [matrix, setMatrix] = useState<number[]>(Array(16).fill(0));
    
    // State for initial conditions
    const [initialConditions, setInitialConditions] = useState({
        x0: 1,
        y0: 1,
        z0: 1,
        w0: 1,
    });
    
    // State for target time
    const [targetTime, setTargetTime] = useState<number>(1);
    
    // State for task and solution
    const [taskId, setTaskId] = useState<number | null>(null);
    const [solution, setSolution] = useState<SolutionDetails | null>(null);
    
    // State for AI explanation
    const [explanation, setExplanation] = useState<string | null>(null);
    
    // Loading and error states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Handle matrix input changes
    const handleMatrixChange = (index: number, value: string) => {
        const newMatrix = [...matrix];
        newMatrix[index] = parseFloat(value) || 0;
        setMatrix(newMatrix);
    };

    // Handle generating a rank-1 matrix
    const handleGenerateRank1 = () => {
        console.log('Generate button clicked!');
        console.log('Current matrix state:', matrix);
        
        // Generate rank-1 matrix: u * v^T
        // Random vectors u and v
        const u = [
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
        ];
        const v = [
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
        ];
        
        // Compute u * v^T
        const newMatrix: number[] = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                newMatrix.push(parseFloat((u[i] * v[j]).toFixed(4)));
            }
        }
        console.log('Setting new matrix:', newMatrix);
        setMatrix(newMatrix);
        setSolution(null);
        setTaskId(null);
        setError(null);
        
        // Force a re-render to ensure state update
        console.log('Matrix state after update:', newMatrix);
    };

    // Handle creating the custom task
    const handleCreateTask = async () => {
        console.log('Solve button clicked!');
        setLoading(true);
        setError(null);
        
        try {
            // Convert flat array to 2D matrix
            const coefficients: number[][] = [];
            for (let i = 0; i < 4; i++) {
                coefficients.push(matrix.slice(i * 4, (i + 1) * 4));
            }
            
            console.log('Creating task with coefficients:', coefficients);
            const task: ODETask = await odeApi.createCustomTask({
                coefficients: { linear: coefficients },
                initial_conditions: initialConditions,
                target_time: targetTime,
            });
            
            console.log('Task created:', task);
            setTaskId(task.task_id);
            
            // Automatically get the solution
            const sol = await odeApi.getSolution(task.task_id);
            console.log('Solution received:', sol);
            setSolution(sol);
        } catch (err) {
            console.error('Error creating task:', err);
            setError(err instanceof Error ? err.message : 'Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    // Handle getting AI explanation
    const handleGetExplanation = async () => {
        if (!taskId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const explanation = await odeApi.getExplanation(taskId);
            setExplanation(explanation.explanation);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get explanation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: '#f5f5f5'
        }}>
            <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{
                    textAlign: 'center',
                    color: '#333',
                    marginBottom: '30px'
                }}>AI Math Stumper - Simple React Frontend</h1>
                
                {/* Matrix Input Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '10px',
                    margin: '20px 0',
                    background: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px'
                }}>
                    {/* Headers */}
                    <div style={{
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '10px',
                        background: '#e9ecef',
                        borderRadius: '4px'
                    }}></div>
                    <div style={{
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '10px',
                        background: '#e9ecef',
                        borderRadius: '4px'
                    }}>x</div>
                    <div style={{
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '10px',
                        background: '#e9ecef',
                        borderRadius: '4px'
                    }}>y</div>
                    <div style={{
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '10px',
                        background: '#e9ecef',
                        borderRadius: '4px'
                    }}>z</div>
                    <div style={{
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '10px',
                        background: '#e9ecef',
                        borderRadius: '4px'
                    }}>w</div>
                    
                    {/* Matrix rows */}
                    {Array.from({ length: 4 }, (_, row) => (
                        <Fragment key={row}>
                            <div style={{
                                fontWeight: 'bold',
                                textAlign: 'right',
                                paddingRight: '8px',
                                paddingTop: '10px'
                            }}>{['x', 'y', 'z', 'w'][row]}&#39;</div>
                            {Array.from({ length: 4 }, (_, col) => {
                                const index = row * 4 + col;
                                return (
                                    <input
                                        key={index}
                                        type="number"
                                        step="0.1"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            border: '2px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '16px',
                                            textAlign: 'center'
                                        }}
                                        value={matrix[index]}
                                        onChange={(e) => handleMatrixChange(index, e.target.value)}
                                        placeholder="0"
                                    />
                                );
                            })}
                        </Fragment>
                    ))}
                </div>
                
                {/* Input Controls */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    margin: '20px 0'
                }}>
                    {/* Initial Conditions */}
                    <div style={{
                        background: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#333' }}>Initial Conditions</h3>
                        <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                            <label style={{ width: '80px', fontWeight: 'bold' }}>x₀:</label>
                            <input
                                type="number"
                                step="0.1"
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    border: '2px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '16px'
                                }}
                                value={initialConditions.x0}
                                onChange={(e) => setInitialConditions({ ...initialConditions, x0: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                            <label style={{ width: '80px', fontWeight: 'bold' }}>y₀:</label>
                            <input
                                type="number"
                                step="0.1"
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    border: '2px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '16px'
                                }}
                                value={initialConditions.y0}
                                onChange={(e) => setInitialConditions({ ...initialConditions, y0: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                            <label style={{ width: '80px', fontWeight: 'bold' }}>z₀:</label>
                            <input
                                type="number"
                                step="0.1"
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    border: '2px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '16px'
                                }}
                                value={initialConditions.z0}
                                onChange={(e) => setInitialConditions({ ...initialConditions, z0: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                            <label style={{ width: '80px', fontWeight: 'bold' }}>w₀:</label>
                            <input
                                type="number"
                                step="0.1"
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    border: '2px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '16px'
                                }}
                                value={initialConditions.w0}
                                onChange={(e) => setInitialConditions({ ...initialConditions, w0: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    {/* Target Time */}
                    <div style={{
                        background: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#333' }}>Target Time</h3>
                        <div style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                            <label style={{ width: '80px', fontWeight: 'bold' }}>t_f:</label>
                            <input
                                type="number"
                                step="0.1"
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    border: '2px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '16px'
                                }}
                                value={targetTime}
                                onChange={(e) => setTargetTime(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>
                
                {/* Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    margin: '20px 0'
                }}>
                    <button
                        onClick={handleGenerateRank1}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: '#007bff',
                            color: 'white'
                        }}
                    >
                        Generate Rank-1 Matrix
                    </button>
                    <button
                        onClick={handleCreateTask}
                        disabled={loading}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            backgroundColor: loading ? '#6c757d' : '#28a745',
                            color: 'white',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Solving...' : 'Solve ODE System'}
                    </button>
                    <button
                        onClick={handleGetExplanation}
                        disabled={!taskId || loading}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: (!taskId || loading) ? 'not-allowed' : 'pointer',
                            backgroundColor: '#ffc107',
                            color: '#333',
                            opacity: (!taskId || loading) ? 0.6 : 1
                        }}
                    >
                        Get Step-by-Step Explanation
                    </button>
                </div>
                
                {/* Error Message */}
                {error && (
                    <div style={{
                        color: '#dc3545',
                        background: '#f8d7da',
                        border: '1px solid #f5c6cb',
                        padding: '10px',
                        borderRadius: '4px',
                        margin: '10px 0'
                    }}>
                        Error: {error}
                    </div>
                )}
                
                {/* Loading State */}
                {loading && (
                    <div style={{
                        textAlign: 'center',
                        color: '#007bff',
                        fontWeight: 'bold',
                        margin: '10px 0'
                    }}>
                        Solving the ODE system...
                    </div>
                )}
                
                {/* Solution Display */}
                {solution && !loading && (
                    <div style={{
                        background: '#e7f3ff',
                        padding: '20px',
                        borderRadius: '8px',
                        margin: '20px 0',
                        border: '2px solid #007bff'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#007bff' }}>
                            Solution at t = {targetTime}
                        </h3>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '10px',
                            margin: '10px 0'
                        }}>
                            <div style={{
                                background: 'white',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #007bff'
                            }}>
                                <strong>x(t):</strong> {solution.final_values[0].toFixed(6)}
                            </div>
                            <div style={{
                                background: 'white',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #007bff'
                            }}>
                                <strong>y(t):</strong> {solution.final_values[1].toFixed(6)}
                            </div>
                            <div style={{
                                background: 'white',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #007bff'
                            }}>
                                <strong>z(t):</strong> {solution.final_values[2].toFixed(6)}
                            </div>
                            <div style={{
                                background: 'white',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #007bff'
                            }}>
                                <strong>w(t):</strong> {solution.final_values[3].toFixed(6)}
                            </div>
                        </div>
                        
                        <div style={{
                            background: '#fff3cd',
                            padding: '15px',
                            borderRadius: '8px',
                            margin: '15px 0',
                            border: '1px solid #ffc107'
                        }}>
                            <strong>Metrics:</strong><br/>
                            Weighted Sum (S): {solution.stored_metrics.weighted_sum.toFixed(6)}<br/>
                            Arc Length: {solution.stored_metrics.arc_length.toFixed(6)}<br/>
                            Curvature: {solution.stored_metrics.curvature.toFixed(6)}<br/>
                            Final Solution (Σ): {solution.stored_metrics.final_solution}
                        </div>
                        
                        {/* LaTeX Solution Display */}
                        {solution.latex_solution && (
                            <div style={{
                                background: '#f8f9fa',
                                padding: '15px',
                                borderRadius: '8px',
                                margin: '15px 0'
                            }}>
                                <h3 style={{ marginTop: 0, color: '#333' }}>Step-by-Step Solution</h3>
                                {parseLatexSolution(solution.latex_solution).map((step, idx) => (
                                    <div key={idx} style={{ marginBottom: '15px' }}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: '#007bff',
                                            marginBottom: '5px'
                                        }}>
                                            {step.title}
                                        </div>
                                        {step.prose && (
                                            <p style={{ margin: '5px 0' }}>{step.prose}</p>
                                        )}
                                        {step.math.map((math, mIdx) => (
                                            <div key={mIdx} style={{ margin: '10px 0' }}>
                                                <div style={{
                                                    background: 'white',
                                                    padding: '10px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ddd',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {math}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {/* AI Explanation Display */}
                {explanation && (
                    <div style={{
                        background: '#d4edda',
                        padding: '20px',
                        borderRadius: '8px',
                        margin: '20px 0',
                        border: '2px solid #28a745',
                        whiteSpace: 'pre-wrap'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#155724' }}>Explanation</h3>
                        <div>{explanation}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    const title = 'AI Math Stumper - Simple Frontend';
    const description = 'Simple React frontend for AI Math Stumper with working buttons';
    
    return [
        { title },
        { name: 'description', content: description },
        { tagName: 'link', rel: 'canonical', href: data?.canonicalUrl },
        { property: 'robots', content: 'index, follow' },
    ];
};

export const links = () => {
    return [
        { rel: 'icon', href: '/favicon.ico', type: 'image/ico' },
    ];
};