from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from .save_prompt_view import SavePromptView

urlpatterns = [
    path('api/generate/', views.GenerateODETaskView.as_view(), name='generate_ode_task'),
    path('api/create_custom/', views.CreateCustomTaskView.as_view(), name='create_custom_task'),
    path('api/verify/', views.VerifySolutionView.as_view(), name='verify_solution'),
    path('api/problems/', views.ProblemListView.as_view(), name='problem_list'),
    path('api/task/<int:task_id>/', views.TaskDetailView.as_view(), name='task_detail'),
    path('api/task/<int:task_id>/solution/', views.TaskSolutionView.as_view(), name='task_solution'),
    path('api/task/<int:task_id>/explain/', views.AIExplanationView.as_view(), name='ai_explanation'),
    path('api/hint/', views.AIHintView.as_view(), name='ai_hint'),
    path('api/save_prompt/', SavePromptView.as_view(), name='save_prompt'),
    path('api/user/', views.UserView.as_view(), name='user'),
    path('api/auth/login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='api_login'),
    path('api/auth/logout/', auth_views.LogoutView.as_view(), name='api_logout'),
    path('api/auth/register/', views.RegisterView.as_view(), name='api_register'),
    path('', views.index, name='index'),
]
