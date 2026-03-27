import classNames from 'classnames';
import { useState, Fragment } from 'react';
import styles from './_index.module.scss';
import { LinksFunction, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import commonStyles from '~/styles/common-styles.module.scss';
import { getUrlOriginWithPath } from '~/utils';
import { odeApi, ODETask, SolutionDetails } from '~/services/api';
import reactKatexPkg from 'react-katex';
const { InlineMath, BlockMath } = (reactKatexPkg as any) || {};
import classes from './route.module.scss';

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
    return { canonicalUrl: getUrlOriginWithPath(request.url) };
};

export default function HomePage() {
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
        setMatrix(newMatrix);
        setSolution(null);
        setTaskId(null);
        setError(null);
    };

    // Handle creating the custom task
    const handleCreateTask = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Convert flat array to 2D matrix
            const coefficients: number[][] = [];
            for (let i = 0; i < 4; i++) {
                coefficients.push(matrix.slice(i * 4, (i + 1) * 4));
            }
            
            const task: ODETask = await odeApi.createCustomTask({
                coefficients: { linear: coefficients },
                initial_conditions: initialConditions,
                target_time: targetTime,
            });
            
            setTaskId(task.task_id);
            
            // Automatically get the solution
            const sol = await odeApi.getSolution(task.task_id);
            setSolution(sol);
        } catch (err) {
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

    // State for AI explanation
    const [explanation, setExplanation] = useState<string | null>(null);

    return (
        <div className={styles.root}>
            <div className={styles.title}>AI Math Stumper</div>
            
            {/* Matrix Input Grid */}
            <div style={{ display: 'block', visibility: 'visible', opacity: '1', position: 'relative', zIndex: '9999', backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '24px', borderRadius: '12px', border: '2px solid #000000', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', margin: '20px auto', maxWidth: '800px' }}>
                <span style={{ display: 'block', visibility: 'visible', opacity: '1', position: 'relative', zIndex: '9999', fontSize: '1.2rem', fontWeight: 'bold', color: '#000000', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>COEFFICIENT MATRIX A</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                    {/* Column headers */}
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', paddingBottom: '8px' }}></div>
                    <div className={classes.matrixColumnLabel} style={{ fontSize: '0.8rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', paddingBottom: '8px' }}>x</div>
                    <div className={classes.matrixColumnLabel} style={{ fontSize: '0.8rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', paddingBottom: '8px' }}>y</div>
                    <div className={classes.matrixColumnLabel} style={{ fontSize: '0.8rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', paddingBottom: '8px' }}>z</div>
                    <div className={classes.matrixColumnLabel} style={{ fontSize: '0.8rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', paddingBottom: '8px' }}>w</div>
                    
                    {/* Matrix rows */}
                    {Array.from({ length: 4 }, (_, row) => (
                        <Fragment key={row}>
                            <div className={classes.matrixRowLabel} style={{ fontSize: '0.8rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'right', paddingRight: '8px' }}>{['x', 'y', 'z', 'w'][row]}'</div>
                            {Array.from({ length: 4 }, (_, col) => {
                                const index = row * 4 + col;
                                return (
                                    <input
                                        key={index}
                                        type="number"
                                        step="0.1"
                                        className={classes.input}
                                        style={{ width: '100%', height: '50px', padding: '12px', fontSize: '1.1rem', textAlign: 'center', border: '2px solid #000000', borderRadius: '8px', backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box', transition: 'all 0.3s ease', fontFamily: 'Courier New, monospace', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                        value={matrix[index]}
                                        onChange={(e) => handleMatrixChange(index, e.target.value)}
                                        placeholder="0"
                                    />
                                );
                            })}
                        </Fragment>
                    ))}
                </div>
            </div>
            
            {/* Input Containers */}
            <div className={classes.inputsContainer}>
                {/* Initial Conditions */}
                <div className={classes.initialConditions}>
                    <div className={classes.conditionsTitle}>Initial Conditions</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className={classes.conditionGroup}>
                            <label className={classes.conditionLabel}>x₀</label>
                            <input
                                type="number"
                                step="0.1"
                                className={classes.input}
                                style={{ width: '100%', height: '44px' }}
                                value={initialConditions.x0}
                                onChange={(e) => setInitialConditions({ ...initialConditions, x0: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className={classes.conditionGroup}>
                            <label className={classes.conditionLabel}>y₀</label>
                            <input
                                type="number"
                                step="0.1"
                                className={classes.input}
                                style={{ width: '100%', height: '44px' }}
                                value={initialConditions.y0}
                                onChange={(e) => setInitialConditions({ ...initialConditions, y0: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className={classes.conditionGroup}>
                            <label className={classes.conditionLabel}>z₀</label>
                            <input
                                type="number"
                                step="0.1"
                                className={classes.input}
                                style={{ width: '100%', height: '44px' }}
                                value={initialConditions.z0}
                                onChange={(e) => setInitialConditions({ ...initialConditions, z0: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className={classes.conditionGroup}>
                            <label className={classes.conditionLabel}>w₀</label>
                            <input
                                type="number"
                                step="0.1"
                                className={classes.input}
                                style={{ width: '100%', height: '44px' }}
                                value={initialConditions.w0}
                                onChange={(e) => setInitialConditions({ ...initialConditions, w0: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                </div>

                {/* Target Time */}
                <div className={classes.targetTime}>
                    <div className={classes.targetTitle}>Target Time</div>
                    <div className={classes.conditionGroup}>
                        <label className={classes.targetLabel}>Final Time (t_f)</label>
                        <input
                            type="number"
                            step="0.1"
                            className={classes.input}
                            style={{ width: '100%', height: '44px' }}
                            value={targetTime}
                            onChange={(e) => setTargetTime(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                </div>
            </div>
            
            
            {/* Buttons */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', margin: '10px 0', flexWrap: 'wrap' }}>
                <button 
                    style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#007bff', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}
                    onClick={handleGenerateRank1}
                >
                    Generate Rank-1 Matrix
                </button>
                <button 
                    style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#28a745', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}
                    onClick={handleCreateTask}
                    disabled={loading}
                >
                    {loading ? 'Solving...' : 'Solve ODE System'}
                </button>
            </div>
            
            {/* Error Message */}
            {error && (
                <div className={classes.solution}>
                    <p style={{ color: 'red' }}>Error: {error}</p>
                </div>
            )}
            
            {/* Loading State */}
            {loading && (
                <div className={classes.loading}>
                    Solving the ODE system...
                </div>
            )}
            
            {/* Solution Display */}
            {solution && !loading && (
                <div className={classes.solution}>
                    <div className={classes.solutionTitle}>Solution at t = {targetTime}</div>
                    
                    <div className={classes.solutionValues}>
                        <div className={classes.solutionItem}>
                            <span className={classes.solutionLabel}>x(t)</span>
                            <span className={classes.solutionValue}>{solution.final_values[0].toFixed(6)}</span>
                        </div>
                        <div className={classes.solutionItem}>
                            <span className={classes.solutionLabel}>y(t)</span>
                            <span className={classes.solutionValue}>{solution.final_values[1].toFixed(6)}</span>
                        </div>
                        <div className={classes.solutionItem}>
                            <span className={classes.solutionLabel}>z(t)</span>
                            <span className={classes.solutionValue}>{solution.final_values[2].toFixed(6)}</span>
                        </div>
                        <div className={classes.solutionItem}>
                            <span className={classes.solutionLabel}>w(t)</span>
                            <span className={classes.solutionValue}>{solution.final_values[3].toFixed(6)}</span>
                        </div>
                    </div>
                    
                    <div className={classes.metrics}>
                        <div className={classes.metricItem}>
                            <strong>Weighted Sum (S):</strong> {solution.stored_metrics.weighted_sum.toFixed(6)}
                        </div>
                        <div className={classes.metricItem}>
                            <strong>Arc Length:</strong> {solution.stored_metrics.arc_length.toFixed(6)}
                        </div>
                        <div className={classes.metricItem}>
                            <strong>Curvature:</strong> {solution.stored_metrics.curvature.toFixed(6)}
                        </div>
                        <div className={classes.metricItem}>
                            <strong>Final Solution (Σ):</strong> {solution.stored_metrics.final_solution}
                        </div>
                    </div>
                    
                    {/* LaTeX Solution Display */}
                    {solution.latex_solution && (
                        <div className={classes.latexSolution}>
                            <div className={classes.solutionTitle}>Step-by-Step Solution</div>
                            {parseLatexSolution(solution.latex_solution).map((step, idx) => (
                                <div key={idx} className={classes.step}>
                                    <div className={classes.stepTitle}>{step.title}</div>
                                    {step.prose && <p className={classes.stepProse}>{step.prose}</p>}
                                    {step.math.map((math, mIdx) => (
                                        <div key={mIdx} className={classes.mathBlock}>
                                            <BlockMath math={math} />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Get Explanation Button */}
                    <div className={classes.buttonGroup}>
                        <button 
                            className={classNames(commonStyles.primaryButton, styles.button)}
                            onClick={handleGetExplanation}
                            disabled={loading}
                        >
                            Get Step-by-Step Explanation
                        </button>
                    </div>
                    
                    {/* AI Explanation Display */}
                    {explanation && (
                        <div className={classes.explanation}>
                            <div className={classes.solutionTitle}>Explanation</div>
                            <div className={classes.explanationContent}>
                                {explanation.split('\n').map((line, i) => (
                                    <p key={i}>{line}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    const title = 'Website Starter';
    const description = 'Welcome to the Website Starter';
    const imageUrl = 'https://website-starter.com/og-image.png';

    return [
        { title },
        {
            name: 'description',
            content: description,
        },
        {
            tagName: 'link',
            rel: 'canonical',
            href: data?.canonicalUrl,
        },
        {
            property: 'robots',
            content: 'index, follow',
        },
        {
            property: 'og:title',
            content: title,
        },
        {
            property: 'og:description',
            content: description,
        },
        {
            property: 'og:image',
            content: imageUrl,
        },
        {
            name: 'twitter:card',
            content: 'summary_large_image',
        },
        {
            name: 'twitter:title',
            content: title,
        },
        {
            name: 'twitter:description',
            content: description,
        },
        {
            name: 'twitter:image',
            content: imageUrl,
        },
    ];
};

export const links: LinksFunction = () => {
    return [
        {
            rel: 'icon',
            href: '/favicon.ico',
            type: 'image/ico',
        },
    ];
};
