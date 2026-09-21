from django.urls import path

from . import views

app_name = 'core'

urlpatterns = [
    path('health/', views.health, name='health'),
    path('search/', views.search, name='search'),
]