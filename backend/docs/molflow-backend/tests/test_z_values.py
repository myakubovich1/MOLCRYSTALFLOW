import unittest
from unittest.mock import patch

try:
    from fastapi import HTTPException
    from app import main
except ModuleNotFoundError:
    HTTPException = None
    main = None


@unittest.skipIf(main is None, "FastAPI is not installed")
class ZValueValidationTests(unittest.TestCase):
    def test_accepts_every_configured_z_value(self):
        with (
            patch.object(main, "ALLOWED_Z_VALUES", set(range(1, 9))),
            patch.object(main, "DEFAULT_Z_VALUES", [2, 4]),
        ):
            self.assertEqual(
                main.normalize_z_values([8, 1, 4, 4, 2, 3, 5, 6, 7]),
                list(range(1, 9)),
            )

    def test_empty_request_uses_configured_defaults(self):
        with (
            patch.object(main, "ALLOWED_Z_VALUES", set(range(1, 9))),
            patch.object(main, "DEFAULT_Z_VALUES", [2, 4]),
        ):
            self.assertEqual(main.normalize_z_values([]), [2, 4])

    def test_rejects_values_outside_configured_range(self):
        with (
            patch.object(main, "ALLOWED_Z_VALUES", set(range(1, 9))),
            patch.object(main, "DEFAULT_Z_VALUES", [2, 4]),
        ):
            with self.assertRaises(HTTPException) as context:
                main.normalize_z_values([2, 9])
        self.assertEqual(context.exception.status_code, 422)
        self.assertIn("Unsupported zValues: 9", context.exception.detail)


if __name__ == "__main__":
    unittest.main()
