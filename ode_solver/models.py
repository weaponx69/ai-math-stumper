from django.db import models
from django.utils import timezone
import json
from decimal import Decimal


class ODETask(models.Model):
    # Coefficients for the four coupled nonlinear ODE system
    # Each equation has coefficients for terms like: x, y, z, w, xy, xz, xw, yz, yw, zw, x^2, y^2, z^2, w^2, etc.
    coefficients = models.JSONField(
        help_text="Coefficients for nonlinear terms in the ODE system"
    )
    
    # Initial conditions
    x0 = models.DecimalField(max_digits=20, decimal_places=15, help_text="Initial value for x")
    y0 = models.DecimalField(max_digits=20, decimal_places=15, help_text="Initial value for y")
    z0 = models.DecimalField(max_digits=20, decimal_places=15, help_text="Initial value for z")
    w0 = models.DecimalField(max_digits=20, decimal_places=15, help_text="Initial value for w")
    
    # Target time
    target_time = models.DecimalField(max_digits=20, decimal_places=15, help_text="Target time t_f")
    
    # Final values at target time (computed by the solver)
    x_final = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True, help_text="Final value for x at t_f")
    y_final = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True, help_text="Final value for y at t_f")
    z_final = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True, help_text="Final value for z at t_f")
    w_final = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True, help_text="Final value for w at t_f")
    
    # Ground truth results
    weighted_sum = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True, help_text="Weighted sum S")
    arc_length = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True, help_text="Arc length L")
    curvature = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True, help_text="Curvature κ at t_f")
    
    # Final integer solution
    final_solution = models.IntegerField(null=True, blank=True, help_text="Final integer solution ℒ")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_valid = models.BooleanField(default=False, help_text="Whether the system was successfully solved")
    
    def __str__(self):
        return f"ODETask {self.pk}: t_f={self.target_time}"
    
    def get_coefficients_dict(self):
        """Return coefficients as a dictionary"""
        if isinstance(self.coefficients, str):
            return json.loads(self.coefficients)
        return self.coefficients
    
    def set_coefficients_dict(self, coeff_dict):
        """Set coefficients from a dictionary"""
        self.coefficients = coeff_dict


class Solution(models.Model):
    """Model for storing AI-generated LaTeX solutions for mathematical systems."""
    
    # Raw computational output
    raw_output = models.TextField(help_text="Raw computational output from ODE solver")
    
    # AI-generated LaTeX solution
    latex_solution = models.TextField(help_text="AI-generated LaTeX solution string")
    
    # Numerical values extracted from the solution
    x_final = models.DecimalField(
        max_digits=15, 
        decimal_places=12, 
        null=True, 
        blank=True,
        help_text="Final value of x"
    )
    y_final = models.DecimalField(
        max_digits=15, 
        decimal_places=12, 
        null=True, 
        blank=True,
        help_text="Final value of y"
    )
    z_final = models.DecimalField(
        max_digits=15, 
        decimal_places=12, 
        null=True, 
        blank=True,
        help_text="Final value of z"
    )
    w_final = models.DecimalField(
        max_digits=15, 
        decimal_places=12, 
        null=True, 
        blank=True,
        help_text="Final value of w"
    )
    
    weighted_sum = models.DecimalField(
        max_digits=15, 
        decimal_places=12, 
        null=True, 
        blank=True,
        help_text="Weighted sum S = xf + 2*yf + 3*zf + 4*wf"
    )
    
    arc_length = models.DecimalField(
        max_digits=15, 
        decimal_places=12, 
        null=True, 
        blank=True,
        help_text="Arc length L of the solution curve"
    )
    
    curvature = models.DecimalField(
        max_digits=15, 
        decimal_places=12, 
        null=True, 
        blank=True,
        help_text="Curvature κ of the solution curve"
    )
    
    final_solution = models.IntegerField(
        null=True, 
        blank=True,
        help_text="Final calculated solution ℒ"
    )
    
    # Associated ODE task
    ode_task = models.ForeignKey(
        ODETask, 
        on_delete=models.CASCADE, 
        related_name='solutions',
        null=True,
        blank=True,
        help_text="Associated ODE task"
    )
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "AI Solution"
        verbose_name_plural = "AI Solutions"
    
    def __str__(self):
        return f"Solution {self.pk} - Task {self.ode_task_id if self.ode_task else 'None'}"
    
    def save(self, *args, **kwargs):
        """Override save to extract numerical values from LaTeX solution."""
        if self.latex_solution:
            from .services import extract_numerical_values
            extracted_values = extract_numerical_values(self.latex_solution)
            
            # Update model fields with extracted values
            for field, value in extracted_values.items():
                if hasattr(self, field):
                    setattr(self, field, value)
        
        super().save(*args, **kwargs)
    
    def validate_latex(self):
        """Validate that the LaTeX solution follows required formatting rules."""
        from .services import validate_latex_solution
        return validate_latex_solution(self.latex_solution)
    
    def get_solution_summary(self):
        """Get a summary of the solution values."""
        return {
            'x_final': float(self.x_final) if self.x_final else None,
            'y_final': float(self.y_final) if self.y_final else None,
            'z_final': float(self.z_final) if self.z_final else None,
            'w_final': float(self.w_final) if self.w_final else None,
            'weighted_sum': float(self.weighted_sum) if self.weighted_sum else None,
            'arc_length': float(self.arc_length) if self.arc_length else None,
            'curvature': float(self.curvature) if self.curvature else None,
            'final_solution': self.final_solution
        }
