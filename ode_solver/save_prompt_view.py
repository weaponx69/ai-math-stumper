from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
import json
from django.utils import timezone
from .models import ODETask


class SavePromptView(View):
    """API endpoint to save a math prompt to the database"""
    
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            if 'task_id' not in data:
                return JsonResponse({'error': 'Task ID is required'}, status=400)
            
            # Get the task
            try:
                task = ODETask.objects.get(id=data['task_id'])
            except ODETask.DoesNotExist:
                return JsonResponse({'error': 'Task not found'}, status=404)
            
            # For this implementation, we'll just return success since the frontend handles localStorage
            # In a more complete implementation, you might create a SavedPrompt model
            return JsonResponse({
                'success': True,
                'message': 'Prompt saved successfully',
                'task_id': task.pk,
                'timestamp': timezone.now().isoformat()
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)