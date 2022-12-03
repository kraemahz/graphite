#!/usr/bin/env python
# -*- coding: utf-8 -*-
import ast
import os

from distutils.core import setup

with open('graphite/version_info.py', 'rt', encoding='utf8') as fobj:
    assigments_raw = fobj.read()

assignments = ast.parse(assigments_raw)
version_info = {assign.targets[0].id: assign.value.s
                for assign in assignments.body}
date = version_info.pop('date')

with open('requirements.txt',  'rt') as fobj:
    requirements = fobj.read().split('\n')

with open('README.md', 'rt', encoding='utf8') as fobj:
    long_description = fobj.read()

setup(**version_info,
      long_description=long_description,
      packages=['graphite'],
      install_requires=requirements)
