from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django.conf import settings
import json
import decimal
from decimal import Decimal
from .models import ODETask
from .services import ODEGenerator, format_latex_solution, format_equation_latex
import openai


def get_openai_client():
    """Get OpenAI client with API key from settings"""
    api_key = getattr(settings, 'OPENAI_API_KEY', None)
    if not api_key or api_key == 'your-openai-api-key-here':
        return None
    return openai.OpenAI(api_key=api_key)


def index(request):
    """Redirect to React frontend"""
    from django.http import HttpResponseRedirect
    return HttpResponseRedirect('http://localhost:3000')


class UserView(View):
    """API endpoint to get current user info"""
    
    def get(self, request):
        """Return user authentication status"""
        return JsonResponse({
            'is_authenticated': request.user.is_authenticated,
            'username': request.user.username if request.user.is_authenticated else None,
        })


class RegisterView(View):
    """Registration view to create new user accounts"""
    
    def get(self, request):
        """Show registration form"""
        if request.user.is_authenticated:
            # Redirect to homepage if already logged in
            from django.http import HttpResponseRedirect
            return HttpResponseRedirect('http://localhost:3000')
        
        form = UserCreationForm()
        return render(request, 'registration/register.html', {'form': form})
    
    def post(self, request):
        """Process registration form"""
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Log the user in after registration
            login(request, user)
            # Redirect to the frontend
            from django.http import HttpResponseRedirect
            return HttpResponseRedirect('http://localhost:3000')
        return render(request, 'registration/register.html', {'form': form})


class GenerateODETaskView(View):
    """API endpoint to generate a new ODE task"""
    
    def get(self, request):
        import traceback
        print("=" * 60)
        print("DEBUG: GenerateODETaskView.get started") 
        print("=" * 60)
        
        try:
            generator = ODEGenerator()
            print("DEBUG: ODEGenerator created")
            
            # Generate a valid ODE task
            print("DEBUG: Calling generate_valid_ode_task()...")
            task_data = generator.generate_valid_ode_task()
            print("DEBUG: generate_valid_ode_task returned:", task_data is not None)
            
            if not task_data:
                print("DEBUG: GenerateODETaskView.get - could not generate valid ODE task")
                return JsonResponse({'error': 'Could not generate a valid ODE task'}, status=500)
            
            print("DEBUG: Task data generated successfully, creating database record...")
            
            # Create database record
            ode_task = ODETask.objects.create(
                coefficients=task_data['coefficients'],
                x0=task_data['initial_conditions']['x0'],
                y0=task_data['initial_conditions']['y0'],
                z0=task_data['initial_conditions']['z0'],
                w0=task_data['initial_conditions']['w0'],
                target_time=task_data['target_time'],
                x_final=task_data['solution']['final_values'][0],
                y_final=task_data['solution']['final_values'][1],
                z_final=task_data['solution']['final_values'][2],
                w_final=task_data['solution']['final_values'][3],
                weighted_sum=task_data['solution']['weighted_sum'],
                arc_length=task_data['solution']['arc_length'],
                curvature=task_data['solution']['curvature'],
                final_solution=task_data['solution']['final_solution'],
                is_valid=True
            )
            
            print("DEBUG: Database record created with ID:", ode_task.pk)
            
            # Return task details (without the solution for challenge)
            response_data = {
                'task_id': ode_task.pk,
                'coefficients': ode_task.get_coefficients_dict(),
                'initial_conditions': {
                    'x0': float(ode_task.x0),
                    'y0': float(ode_task.y0),
                    'z0': float(ode_task.z0),
                    'w0': float(ode_task.w0),
                },
                'target_time': float(ode_task.target_time),
                'equation_preview': self.get_equation_preview(
                    ode_task.get_coefficients_dict(), 
                    ode_task.target_time,
                    (float(ode_task.x0), float(ode_task.y0), float(ode_task.z0), float(ode_task.w0))
                )
            }
            
            print("DEBUG: Response prepared, returning JSON")
            return JsonResponse(response_data)
            
        except Exception as e:
            print("=" * 60)
            print("DEBUG: GenerateODETaskView.get EXCEPTION")
            print("ERROR:", str(e))
            print(traceback.format_exc())
            print("=" * 60)
            return JsonResponse({'error': str(e)}, status=500)
    
    def get_equation_preview(self, coefficients, target_time=None, initial_conditions=None):
        """Generate a LaTeX representation of the ODE system"""
        # This will be used for frontend display
        preview = {
            'dx_dt': format_equation_latex(coefficients, 'x'),
            'dy_dt': format_equation_latex(coefficients, 'y'),
            'dz_dt': format_equation_latex(coefficients, 'z'),
            'dw_dt': format_equation_latex(coefficients, 'w'),
        }
        
        # For consistency, also generate a basic raw_latex field
        # This ensures both generated and custom tasks have the same structure
        if target_time is not None and initial_conditions is not None:
            # Generate a simple raw LaTeX representation
            dx = preview['dx_dt']
            dy = preview['dy_dt']
            dz = preview['dz_dt']
            dw = preview['dw_dt']
            
            # Create the aligned environment with pure mathematical content
            raw_latex = f"$$\n\\begin{{aligned}}\n{dx} \\\\\n{dy} \\\\\n{dz} \\\\\n{dw}\n\\end{{aligned}}\n$$"
            preview['raw_latex'] = raw_latex
        
        return preview



class CreateCustomTaskView(GenerateODETaskView):
    """API endpoint to create a custom ODE task"""

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        # Using super().dispatch correctly calls the next class in MRO (View.dispatch)
        return super().dispatch(*args, **kwargs)
        
    def post(self, request):
        """Create a new ODE task from submitted parameters"""
        try:
            data = json.loads(request.body)
            
            # Extract parameters
            coefficients = data.get('coefficients')
            initial_conditions_dict = data.get('initial_conditions')
            target_time = data.get('target_time')
            
            if not coefficients or not initial_conditions_dict or target_time is None:
                return JsonResponse({'error': 'Missing required parameters'}, status=400)
            
            # Format initial conditions
            initial_conditions = (
                float(initial_conditions_dict.get('x0', 0)),
                float(initial_conditions_dict.get('y0', 0)),
                float(initial_conditions_dict.get('z0', 0)),
                float(initial_conditions_dict.get('w0', 0))
            )
            
            generator = ODEGenerator()
            
            # Create the custom task
            task_data = generator.create_custom_task(coefficients, initial_conditions, float(target_time))
            
            if not task_data:
                return JsonResponse({'error': 'Could not solve the system with provided parameters'}, status=400)
            
            # Create database record
            ode_task = ODETask.objects.create(
                coefficients=task_data['coefficients'],
                x0=task_data['initial_conditions']['x0'],
                y0=task_data['initial_conditions']['y0'],
                z0=task_data['initial_conditions']['z0'],
                w0=task_data['initial_conditions']['w0'],
                target_time=task_data['target_time'],
                x_final=task_data['solution']['final_values'][0],
                y_final=task_data['solution']['final_values'][1],
                z_final=task_data['solution']['final_values'][2],
                w_final=task_data['solution']['final_values'][3],
                weighted_sum=task_data['solution']['weighted_sum'],
                arc_length=task_data['solution']['arc_length'],
                curvature=task_data['solution']['curvature'],
                final_solution=task_data['solution']['final_solution'],
                is_valid=True
            )
            
            # Reuse the response format from GenerateODETaskView
            # We can't easily reuse the 'get' method code without refactoring, so we duplicate the response structure
            response_data = {
                'task_id': ode_task.pk,
                'coefficients': ode_task.get_coefficients_dict(),
                'initial_conditions': {
                    'x0': float(ode_task.x0),
                    'y0': float(ode_task.y0),
                    'z0': float(ode_task.z0),
                    'w0': float(ode_task.w0),
                },
                'target_time': float(ode_task.target_time),
                'equation_preview': self.get_equation_preview(
                    ode_task.get_coefficients_dict(), 
                    ode_task.target_time,
                    initial_conditions
                )
            }
            
            return JsonResponse(response_data)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class VerifySolutionView(View):
    """API endpoint to verify a submitted solution"""
    
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Verify a submitted solution against the ground truth"""
        try:
            data = json.loads(request.body)
            task_id = data.get('task_id')
            submitted_solution = data.get('solution')
            
            if not task_id or submitted_solution is None:
                return JsonResponse({'error': 'Missing task_id or solution'}, status=400)
            
            # Get the ODE task
            try:
                ode_task = ODETask.objects.get(pk=task_id)
            except ODETask.DoesNotExist:
                return JsonResponse({'error': 'Task not found'}, status=404)
            
            # Compare with ground truth
            ground_truth = ode_task.final_solution
            is_correct = submitted_solution == ground_truth
            
            response_data = {
                'task_id': task_id,
                'submitted_solution': submitted_solution,
                'ground_truth': int(ground_truth) if ground_truth is not None else None,
                'is_correct': is_correct,
                'details': {
                    'weighted_sum': float(ode_task.weighted_sum) if ode_task.weighted_sum else None,
                    'arc_length': float(ode_task.arc_length) if ode_task.arc_length else None,
                    'curvature': float(ode_task.curvature) if ode_task.curvature else None,
                }
            }
            
            return JsonResponse(response_data)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class TaskDetailView(View):
    """API endpoint to get details of a specific task"""
    
    def get(self, request, task_id):
        """Get details of a specific ODE task"""
        try:
            # Try to get the task, but catch any database conversion errors
            try:
                ode_task = ODETask.objects.get(pk=task_id)
            except (decimal.InvalidOperation, ValueError, TypeError) as e:
                print(f"DEBUG: Database conversion error for task {task_id}: {e}")
                return JsonResponse({'error': f'Database error: {str(e)}'}, status=500)
            
            # Use the same formatting methods as GenerateODETaskView
            generator_view = GenerateODETaskView()
            equation_preview = generator_view.get_equation_preview(ode_task.get_coefficients_dict())
            
            # Safely convert Decimal fields to float with error handling
            def safe_float_conversion(value, field_name):
                try:
                    if value is None:
                        return 0.0
                    return float(value)
                except (ValueError, TypeError, decimal.InvalidOperation) as e:
                    print(f"DEBUG: Error converting {field_name}: {e}")
                    return 0.0
            
            response_data = {
                'task_id': ode_task.pk,
                'coefficients': ode_task.get_coefficients_dict(),
                'initial_conditions': {
                    'x0': safe_float_conversion(ode_task.x0, 'x0'),
                    'y0': safe_float_conversion(ode_task.y0, 'y0'),
                    'z0': safe_float_conversion(ode_task.z0, 'z0'),
                    'w0': safe_float_conversion(ode_task.w0, 'w0'),
                },
                'target_time': safe_float_conversion(ode_task.target_time, 'target_time'),
                'equation_preview': equation_preview,
                'created_at': ode_task.created_at.isoformat(),
                'is_valid': ode_task.is_valid
            }
            
            return JsonResponse(response_data)
            
        except ODETask.DoesNotExist:
            return JsonResponse({'error': 'Task not found'}, status=404)


class ProblemListView(View):
    """API endpoint to list all ODE tasks (problems)"""
    
    def get(self, request):
        """Get list of all ODE tasks"""
        try:
            # Get all tasks, ordered by most recent
            tasks = ODETask.objects.all().order_by('-created_at')[:50]  # Limit to 50 most recent
            
            # Format response to match what ProblemList.js expects
            problems = []
            for task in tasks:
                # Generate a "question" from the equation preview
                preview = GenerateODETaskView().get_equation_preview(
                    task.get_coefficients_dict(),
                    task.target_time,
                    (float(task.x0), float(task.y0), float(task.z0), float(task.w0))
                )
                
                problems.append({
                    'id': task.pk,
                    'task_id': task.pk,
                    'question': f"Solve the ODE system with target time t_f = {float(task.target_time)}",
                    'answer': task.final_solution,
                    'created_at': task.created_at.isoformat(),
                    'target_time': float(task.target_time),
                    'initial_conditions': {
                        'x0': float(task.x0),
                        'y0': float(task.y0),
                        'z0': float(task.z0),
                        'w0': float(task.w0),
                    },
                    'equation_preview': preview
                })
            
            return JsonResponse({'problems': problems})
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class TaskSolutionView(View):
    """API endpoint to get detailed solution for a specific task"""
    
    def get(self, request, task_id):
        """Get detailed solution information for educational purposes"""
        try:
            ode_task = ODETask.objects.get(pk=task_id)
            
            # Use the same formatting methods as GenerateODETaskView
            generator_view = GenerateODETaskView()
            initial_conditions = (float(ode_task.x0), float(ode_task.y0), float(ode_task.z0), float(ode_task.w0))
            equation_preview = generator_view.get_equation_preview(
                ode_task.get_coefficients_dict(),
                float(ode_task.target_time),
                initial_conditions
            )
            
            # Get final values (with fallback to initial conditions for old tasks)
            final_values = [
                float(ode_task.x_final) if ode_task.x_final is not None else float(ode_task.x0),
                float(ode_task.y_final) if ode_task.y_final is not None else float(ode_task.y0),
                float(ode_task.z_final) if ode_task.z_final is not None else float(ode_task.z0),
                float(ode_task.w_final) if ode_task.w_final is not None else float(ode_task.w0)
            ]
            
            # Recalculate metrics from final values to verify consistency
            recalculated_weighted_sum = self.calculate_weighted_sum(final_values)
            recalculated_arc_length = float(ode_task.arc_length) if ode_task.arc_length else 0.0  # Arc length requires integration, use stored value
            recalculated_curvature = float(ode_task.curvature) if ode_task.curvature else 0.0  # Use stored value
            recalculated_final_solution = self.calculate_final_solution(final_values)
            
            # Check for consistency between stored and recalculated values
            weighted_sum_consistent = abs(float(ode_task.weighted_sum) - recalculated_weighted_sum) < 1e-10 if ode_task.weighted_sum else True
            final_solution_consistent = ode_task.final_solution == recalculated_final_solution
            
            response_data = {
                'task_id': ode_task.pk,
                'coefficients': ode_task.get_coefficients_dict(),
                'initial_conditions': {
                    'x0': float(ode_task.x0),
                    'y0': float(ode_task.y0),
                    'z0': float(ode_task.z0),
                    'w0': float(ode_task.w0),
                },
                'target_time': float(ode_task.target_time),
                'equation_preview': equation_preview,
                'final_values': final_values,
                'stored_metrics': {
                    'weighted_sum': float(ode_task.weighted_sum) if ode_task.weighted_sum else 0.0,
                    'arc_length': float(ode_task.arc_length) if ode_task.arc_length else 0.0,
                    'curvature': float(ode_task.curvature) if ode_task.curvature else 0.0,
                    'final_solution': int(ode_task.final_solution) if ode_task.final_solution is not None else None,
                },
                'recalculated_metrics': {
                    'weighted_sum': recalculated_weighted_sum,
                    'arc_length': recalculated_arc_length,
                    'curvature': recalculated_curvature,
                    'final_solution': recalculated_final_solution,
                },
                'consistency_check': {
                    'weighted_sum_consistent': weighted_sum_consistent,
                    'final_solution_consistent': final_solution_consistent,
                    'all_consistent': weighted_sum_consistent and final_solution_consistent
                },
                'created_at': ode_task.created_at.isoformat(),
                'is_valid': ode_task.is_valid,
                'latex_solution': format_latex_solution(
                    ode_task.get_coefficients_dict(),
                    {
                        'x0': float(ode_task.x0),
                        'y0': float(ode_task.y0),
                        'z0': float(ode_task.z0),
                        'w0': float(ode_task.w0)
                    },
                    float(ode_task.target_time),
                    {
                        'final_values': final_values,
                        'weighted_sum': float(ode_task.weighted_sum or 0),
                        'arc_length': float(ode_task.arc_length or 0),
                        'curvature': float(ode_task.curvature or 0),
                        'final_solution': ode_task.final_solution
                    }
                )
            }
            
            return JsonResponse(response_data)
            
        except ODETask.DoesNotExist:
            return JsonResponse({'error': 'Task not found'}, status=404)
    
    def calculate_weighted_sum(self, final_values):
        """Calculate weighted sum from final values: S = x_f + 2*y_f + 3*z_f + 4*w_f"""
        x_f, y_f, z_f, w_f = final_values
        weighted_sum = x_f + 2*y_f + 3*z_f + 4*w_f
        return float(weighted_sum)
    
    def calculate_final_solution(self, final_values):
        """Calculate final solution: ℒ = round(Σ u_i(t_f))"""
        try:
            scalar_sum = sum(final_values)
            return int(round(scalar_sum))
        except Exception:
            return 0


class AIExplanationView(View):
    """API endpoint to get AI-generated explanations for ODE tasks using OpenAI"""
    
    def get(self, request, task_id):
        """Generate an AI explanation for a specific ODE task"""
        client = get_openai_client()
        
        if not client:
            return JsonResponse({
                'error': 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file.',
                'configured': False
            }, status=503)
        
        try:
            # Get the ODE task
            try:
                ode_task = ODETask.objects.get(pk=task_id)
            except ODETask.DoesNotExist:
                return JsonResponse({'error': 'Task not found'}, status=404)
            
            # Get task details
            coefficients = ode_task.get_coefficients_dict()
            initial_conditions = {
                'x0': float(ode_task.x0),
                'y0': float(ode_task.y0),
                'z0': float(ode_task.z0),
                'w0': float(ode_task.w0)
            }
            target_time = float(ode_task.target_time)
            final_values = [
                float(ode_task.x_final) if ode_task.x_final else float(ode_task.x0),
                float(ode_task.y_final) if ode_task.y_final else float(ode_task.y0),
                float(ode_task.z_final) if ode_task.z_final else float(ode_task.z0),
                float(ode_task.w_final) if ode_task.w_final else float(ode_task.w0)
            ]
            
            # Build the prompt
            prompt = self._build_explanation_prompt(
                coefficients, initial_conditions, target_time, final_values
            )
            
            # Call OpenAI API
            model = getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert mathematics tutor specializing in differential equations. Explain concepts clearly with step-by-step reasoning. Use LaTeX formatting for mathematical expressions when helpful."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            ai_explanation = response.choices[0].message.content
            
            return JsonResponse({
                'task_id': task_id,
                'explanation': ai_explanation,
                'model_used': model,
                'success': True
            })
            
        except Exception as e:
            return JsonResponse({
                'error': f'Failed to generate explanation: {str(e)}',
                'success': False
            }, status=500)
    
    def _build_explanation_prompt(self, coefficients, initial_conditions, target_time, final_values):
        """Build a detailed prompt for the AI"""
        linear = coefficients.get('linear', [])
        
        prompt = f"""Please explain how to solve this system of linear differential equations:

The system is: dU/dt = A*U where U = [x, y, z, w]^T

Coefficient matrix A:
{linear[0][0]:.4f} {linear[0][1]:.4f} {linear[0][2]:.4f} {linear[0][3]:.4f}
{linear[1][0]:.4f} {linear[1][1]:.4f} {linear[1][2]:.4f} {linear[1][3]:.4f}
{linear[2][0]:.4f} {linear[2][1]:.4f} {linear[2][2]:.4f} {linear[2][3]:.4f}
{linear[3][0]:.4f} {linear[3][1]:.4f} {linear[3][2]:.4f} {linear[3][3]:.4f}

Initial conditions at t=0:
x(0) = {initial_conditions['x0']}
y(0) = {initial_conditions['y0']}
z(0) = {initial_conditions['z0']}
w(0) = {initial_conditions['w0']}

Target time: t = {target_time}

The numerical solution at t={target_time} is:
x({target_time}) = {final_values[0]:.6f}
y({target_time}) = {final_values[1]:.6f}
z({target_time}) = {final_values[2]:.6f}
w({target_time}) = {final_values[3]:.6f}

Please provide:
1. A brief explanation of the matrix properties (is it diagonalizable? what are the eigenvalues?)
2. The analytical solution method
3. How the numerical solution was computed
4. What the final values tell us about the system's behavior

Keep your explanation educational and accessible for someone learning differential equations."""
        
        return prompt


class AIHintView(View):
    """API endpoint to get AI-generated hints for ODE tasks"""
    
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Generate a hint for an ODE task based on user's progress"""
        client = get_openai_client()
        
        if not client:
            return JsonResponse({
                'error': 'OpenAI API key not configured.',
                'configured': False
            }, status=503)
        
        try:
            data = json.loads(request.body)
            task_id = data.get('task_id')
            user_question = data.get('question', '')
            
            # Get the task
            try:
                ode_task = ODETask.objects.get(pk=task_id)
            except ODETask.DoesNotExist:
                return JsonResponse({'error': 'Task not found'}, status=404)
            
            coefficients = ode_task.get_coefficients_dict()
            target_time = float(ode_task.target_time)
            
            # Build hint prompt
            prompt = f"""The user is working on solving this ODE system:

dx/dt = {coefficients['linear'][0][0]:.2f}x + {coefficients['linear'][0][1]:.2f}y + {coefficients['linear'][0][2]:.2f}z + {coefficients['linear'][0][3]:.2f}w
dy/dt = {coefficients['linear'][1][0]:.2f}x + {coefficients['linear'][1][1]:.2f}y + {coefficients['linear'][1][2]:.2f}z + {coefficients['linear'][1][3]:.2f}w
dz/dt = {coefficients['linear'][2][0]:.2f}x + {coefficients['linear'][2][1]:.2f}y + {coefficients['linear'][2][2]:.2f}z + {coefficients['linear'][2][3]:.2f}w
dw/dt = {coefficients['linear'][3][0]:.2f}x + {coefficients['linear'][3][1]:.2f}y + {coefficients['linear'][3][2]:.2f}z + {coefficients['linear'][3][3]:.2f}w

Target time: t = {target_time}

The user asks: "{user_question}"

Provide a helpful hint (2-3 sentences max) that guides them without giving away the full solution. Be encouraging and specific."""
            
            model = getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful math tutor. Give concise, encouraging hints."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            hint = response.choices[0].message.content
            
            return JsonResponse({
                'hint': hint,
                'success': True
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({
                'error': str(e),
                'success': False
            }, status=500)
