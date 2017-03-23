#FIXME this should be common code, in the flasks module

import logging
import logging.handlers
import sys
import os
from config import LOG_PATH, LOG_SIZE


def get_logger(level):
    """ Get a logger based on the system path.
    """
    if sys.argv[0] == '':
        return FakeLogger()

    logger = logging.getLogger('werkzeug') # use this name so flask doesn't use its own logger
    logger.setLevel(level)

    # create file handler which logs even debug messages (these end up in log file)
    logger.filename = '{0}.log'.format(os.path.basename(sys.argv[0]).replace('.py', ''))
    logger.path = os.path.join(LOG_PATH, logger.filename)
    rf_handler = logging.handlers.RotatingFileHandler(logger.path, maxBytes=LOG_SIZE, backupCount=0)
    rf_handler.setLevel(logging.DEBUG)

    # create console handler with a higher log level (these end up in system journal)
    c_handler = logging.StreamHandler()
    c_handler.setLevel(logging.DEBUG if 'debug' in sys.argv else logging.ERROR)

    # create formatter and add it to the handlers
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    rf_handler.setFormatter(formatter)
    c_handler.setFormatter(formatter)

    # add the handlers to the logger
    logger.addHandler(rf_handler)
    logger.addHandler(c_handler)

    logger.info("Obtained logger")
    return logger


class FakeLogger(object):
    """ Fake logger that does nothing.
    """
    def error(self, *_): # pylint: disable=missing-docstring
        pass

    def warn(self, *_): # pylint: disable=missing-docstring
        pass

    def info(self, *_): # pylint: disable=missing-docstring
        pass

    def debug(self, *_): # pylint: disable=missing-docstring
        pass


