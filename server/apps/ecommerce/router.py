from fastapi import APIRouter
from .subrouters.connections_subrouter import router as connections_router
from .subrouters.recommendations_subrouter import router as recommendations_router
from .subrouters.data_subrouter import router as data_router
from .subrouters.settings_subrouter import router as settings_router
from .subrouters.components_subrouter import router as components_router

router = APIRouter(prefix="/ecommerce")

router.include_router(connections_router)
router.include_router(settings_router)
router.include_router(recommendations_router)
router.include_router(components_router)
router.include_router(data_router)

