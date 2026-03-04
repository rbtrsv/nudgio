from fastapi import APIRouter
from .subrouters.ecommerce_connection_subrouter import router as connections_router
from .subrouters.recommendation_subrouter import router as recommendations_router
from .subrouters.data_subrouter import router as data_router
from .subrouters.recommendation_settings_subrouter import router as settings_router
from .subrouters.components_subrouter import router as components_router
from .subrouters.shopify_oauth_subrouter import router as shopify_oauth_router
from .subrouters.woocommerce_auth_subrouter import router as woocommerce_auth_router

router = APIRouter(prefix="/ecommerce")

router.include_router(connections_router)
router.include_router(settings_router)
router.include_router(recommendations_router)
router.include_router(components_router)
router.include_router(data_router)
router.include_router(shopify_oauth_router)
router.include_router(woocommerce_auth_router)
